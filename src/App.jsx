import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, Bell, CalendarDays, Check, ChevronLeft,
  CircleDollarSign, CreditCard, HandCoins, Home, Landmark, ListChecks,
  MoreHorizontal, Plus, ReceiptText, Settings, ShoppingBag, Tag, Trash2,
  WalletCards, X
} from 'lucide-react';

const initialData = {
  accounts: [
    { id: 'a1', name: 'المحفظة', type: 'نقدي', balance: 1200, color: '#b36b45' },
    { id: 'a2', name: 'الحساب البنكي', type: 'بنكي', balance: 5840, color: '#286a5c' }
  ],
  categories: [
    { id: 'c1', name: 'راتب', kind: 'income', icon: 'دخل' },
    { id: 'c2', name: 'طعام', kind: 'expense', icon: 'مصروف' },
    { id: 'c3', name: 'مواصلات', kind: 'expense', icon: 'مصروف' },
    { id: 'c4', name: 'فواتير', kind: 'expense', icon: 'مصروف' }
  ],
  transactions: [
    { id: 't1', title: 'راتب الشهر', amount: 4800, type: 'income', accountId: 'a2', categoryId: 'c1', date: new Date().toISOString() },
    { id: 't2', title: 'مشتريات المنزل', amount: 186, type: 'expense', accountId: 'a1', categoryId: 'c2', date: new Date(Date.now() - 86400000).toISOString() },
    { id: 't3', title: 'وقود', amount: 120, type: 'expense', accountId: 'a2', categoryId: 'c3', date: new Date(Date.now() - 172800000).toISOString() }
  ],
  debts: [
    { id: 'd1', person: 'أحمد', amount: 650, paid: 200, direction: 'owedToMe', due: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10), note: 'باقي ثمن الهاتف' }
  ],
  shopping: [
    { id: 's1', title: 'اشتراك الإنترنت', estimate: 140, done: false },
    { id: 's2', title: 'مستلزمات المنزل', estimate: 220, done: false }
  ]
};

const navItems = [
  { id: 'home', label: 'الرئيسية', icon: Home },
  { id: 'transactions', label: 'العمليات', icon: ReceiptText },
  { id: 'commitments', label: 'الالتزامات', icon: ListChecks },
  { id: 'settings', label: 'الإعدادات', icon: Settings }
];

const money = value => new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(value);
const shortDate = value => new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'short' }).format(new Date(value));
const uid = prefix => `${prefix}${Date.now()}${Math.random().toString(16).slice(2)}`;

function useStoredData() {
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mizan-data')) || initialData; }
    catch { return initialData; }
  });
  useEffect(() => localStorage.setItem('mizan-data', JSON.stringify(data)), [data]);
  return [data, setData];
}

function App() {
  const [data, setData] = useStoredData();
  const [view, setView] = useState('home');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [commitmentTab, setCommitmentTab] = useState('debts');

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const todayKey = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('mizan-last-reminder') === todayKey) return;
    const soon = data.debts.filter(debt => {
      const days = Math.ceil((new Date(`${debt.due}T23:59:59`) - Date.now()) / 86400000);
      return Number(debt.amount) > Number(debt.paid) && days >= 0 && days <= 3;
    });
    if (soon.length) {
      new Notification('موعد مالي قريب', {
        body: soon.length === 1 ? `دين ${soon[0].person} يستحق قريبًا.` : `لديك ${soon.length} ديون تستحق خلال ٣ أيام.`,
        icon: '/icon.svg'
      });
      localStorage.setItem('mizan-last-reminder', todayKey);
    }
  }, [data.debts]);

  const totals = useMemo(() => {
    const income = data.transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = data.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const balance = data.accounts.reduce((s, a) => s + Number(a.balance), 0) + income - expense;
    return { income, expense, balance };
  }, [data]);

  const notify = message => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const addTransaction = tx => {
    setData(prev => {
      const next = { ...prev, transactions: [{ id: uid('t'), date: new Date().toISOString(), ...tx }, ...prev.transactions] };
      if (tx.debtId) next.debts = prev.debts.map(d => d.id === tx.debtId ? { ...d, paid: Math.min(Number(d.amount), Number(d.paid) + Number(tx.amount)) } : d);
      return next;
    });
    notify(tx.debtId ? 'حُفظت العملية وحُدّث الدين' : 'تمت إضافة العملية');
  };

  const buyItem = item => {
    const accountId = data.accounts[0]?.id;
    const categoryId = data.categories.find(c => c.kind === 'expense')?.id;
    if (!accountId || !categoryId) return notify('أضف حسابًا وفئة مصروف أولًا');
    setData(prev => ({
      ...prev,
      shopping: prev.shopping.map(s => s.id === item.id ? { ...s, done: true } : s),
      transactions: [{ id: uid('t'), title: item.title, amount: item.estimate, type: 'expense', accountId, categoryId, date: new Date().toISOString(), source: 'shopping' }, ...prev.transactions]
    }));
    notify('تم الشراء وإضافته للمصروفات');
  };

  const quickAdd = () => {
    if (view === 'transactions' || view === 'home') setModal('transaction');
    else if (view === 'commitments') setModal(commitmentTab === 'debts' ? 'debt' : 'shopping');
    else setModal('account');
  };

  return (
    <div className="app-shell">
      <aside className="side-rail" aria-label="التنقل الرئيسي">
        <Brand />
        <nav>{navItems.map(item => <NavButton key={item.id} {...item} active={view === item.id} onClick={() => setView(item.id)} />)}</nav>
        <p className="privacy-note">بياناتك محفوظة على جهازك فقط</p>
      </aside>

      <div className="phone-frame">
        <header className="topbar">
          <Brand compact />
          <button className="icon-button notification" aria-label="الإشعارات" onClick={() => setModal('notifications')}>
            <Bell size={21} /><span aria-hidden="true" />
          </button>
        </header>

        <main>
          {view === 'home' && <HomeView data={data} totals={totals} onNavigate={setView} onAdd={setModal} />}
          {view === 'transactions' && <TransactionsView data={data} onDelete={id => setData(p => ({ ...p, transactions: p.transactions.filter(t => t.id !== id) }))} />}
          {view === 'commitments' && <CommitmentsView data={data} tab={commitmentTab} setTab={setCommitmentTab} buyItem={buyItem} onDelete={(kind, id) => setData(p => ({ ...p, [kind]: p[kind].filter(x => x.id !== id) }))} />}
          {view === 'settings' && <SettingsView data={data} setData={setData} setModal={setModal} notify={notify} />}
        </main>

        <button className="fab" onClick={quickAdd} aria-label="إضافة جديد"><Plus size={27} /></button>
        <nav className="bottom-nav" aria-label="التنقل الرئيسي">
          {navItems.map(item => <NavButton key={item.id} {...item} active={view === item.id} onClick={() => setView(item.id)} />)}
        </nav>
      </div>

      {modal && <Modal type={modal} data={data} setData={setData} onClose={() => setModal(null)} onTransaction={addTransaction} notify={notify} />}
      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite"><Check size={18} />{toast}</div>
    </div>
  );
}

function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'compact' : ''}`}><span className="brand-mark"><Landmark size={compact ? 20 : 22} /></span><div><strong>ميزان</strong>{!compact && <small>منظّمك المالي</small>}</div></div>;
}

function NavButton({ id, label, icon: Icon, active, onClick }) {
  return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}><Icon size={21} strokeWidth={active ? 2.5 : 1.8} /><span>{label}</span></button>;
}

function HomeView({ data, totals, onNavigate, onAdd }) {
  const month = new Intl.DateTimeFormat('ar-SA', { month: 'long', year: 'numeric' }).format(new Date());
  const expenseRatio = totals.income ? Math.min(100, Math.round((totals.expense / totals.income) * 100)) : 0;
  return <div className="view home-view">
    <div className="welcome"><div><p>مساء الخير</p><h1>هذه نظرتك المالية</h1></div><span>{month}</span></div>

    <section className="balance-panel" aria-labelledby="balance-title">
      <div className="balance-head"><span id="balance-title">صافي الرصيد</span><MoreHorizontal size={22} /></div>
      <strong className="total-balance"><bdi>{money(totals.balance)}</bdi></strong>
      <div className="money-flow">
        <div><span className="flow-icon income"><ArrowDownLeft size={18} /></span><p>الدخل</p><b><bdi>{money(totals.income)}</bdi></b></div>
        <div><span className="flow-icon expense"><ArrowUpRight size={18} /></span><p>المصروف</p><b><bdi>{money(totals.expense)}</bdi></b></div>
      </div>
      <div className="budget-line"><div><span>المصروف من الدخل</span><b>{expenseRatio}٪</b></div><progress value={expenseRatio} max="100" aria-label={`استهلكت ${expenseRatio} بالمئة من الدخل`} /></div>
    </section>

    <section className="quick-actions" aria-label="إضافة عملية مالية">
      <button className="quick-action income" onClick={() => onAdd('incomeTransaction')}>
        <span><ArrowDownLeft size={21} /></span>
        <span><strong>إضافة دخل</strong><small>اختر الحساب وسجّل المبلغ</small></span>
        <Plus size={18} />
      </button>
      <button className="quick-action expense" onClick={() => onAdd('expenseTransaction')}>
        <span><ArrowUpRight size={21} /></span>
        <span><strong>إضافة مصروف</strong><small>سجّل الدفع أو اربطه بدين</small></span>
        <Plus size={18} />
      </button>
    </section>

    <section className="section accounts-section" aria-labelledby="accounts-title">
      <div className="section-head"><h2 id="accounts-title">حساباتي</h2><button onClick={() => onAdd('account')}>إضافة حساب <Plus size={16} /></button></div>
      <div className="account-strip">
        {data.accounts.map((account, index) => <article className="account-card" key={account.id} style={{ '--account-color': account.color }}>
          <span className="account-icon">{index % 2 ? <CreditCard /> : <WalletCards />}</span>
          <div><p>{account.name}</p><strong><bdi>{money(account.balance)}</bdi></strong><small>{account.type}</small></div>
        </article>)}
      </div>
    </section>

    <section className="section recent-section" aria-labelledby="recent-title">
      <div className="section-head"><h2 id="recent-title">آخر العمليات</h2><button onClick={() => onNavigate('transactions')}>عرض الكل <ChevronLeft size={16} /></button></div>
      <TransactionList transactions={data.transactions.slice(0, 4)} data={data} />
    </section>
  </div>;
}

function TransactionList({ transactions, data, onDelete }) {
  if (!transactions.length) return <Empty icon={ReceiptText} title="لا توجد عمليات بعد" text="أضف أول دخل أو مصروف لتبدأ المتابعة." />;
  return <div className="transaction-list">{transactions.map(tx => {
    const category = data.categories.find(c => c.id === tx.categoryId)?.name || 'غير مصنف';
    return <article className="transaction-row" key={tx.id}>
      <span className={`transaction-icon ${tx.type}`}><Tag size={19} /></span>
      <div className="transaction-copy"><strong>{tx.title}</strong><small>{category} · {shortDate(tx.date)}</small></div>
      <b className={tx.type}><bdi>{tx.type === 'income' ? '+' : '−'} {money(tx.amount)}</bdi></b>
      {onDelete && <button className="delete-mini" onClick={() => onDelete(tx.id)} aria-label={`حذف عملية ${tx.title}`}><Trash2 size={17} /></button>}
    </article>;
  })}</div>;
}

function TransactionsView({ data, onDelete }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? data.transactions : data.transactions.filter(t => t.type === filter);
  return <div className="view page-view">
    <PageTitle eyebrow="سجل واضح" title="العمليات" text="كل حركة مالية في مكان واحد" />
    <div className="segmented compact-tabs" role="group" aria-label="تصفية العمليات">
      {[['all','الكل'],['income','دخل'],['expense','مصروف']].map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}
    </div>
    <section className="ledger"><div className="ledger-head"><span>{filtered.length} عمليات</span><span>من الأحدث</span></div><TransactionList transactions={filtered} data={data} onDelete={onDelete} /></section>
  </div>;
}

function CommitmentsView({ data, tab, setTab, buyItem, onDelete }) {
  return <div className="view page-view">
    <PageTitle eyebrow="لا شيء يفوتك" title="الالتزامات" text="ديونك وما تنوي شراءه، بدون تشتيت" />
    <div className="segmented" role="tablist" aria-label="نوع الالتزام">
      <button role="tab" aria-selected={tab === 'debts'} className={tab === 'debts' ? 'active' : ''} onClick={() => setTab('debts')}><HandCoins size={18} /> الديون <span>{data.debts.length}</span></button>
      <button role="tab" aria-selected={tab === 'shopping'} className={tab === 'shopping' ? 'active' : ''} onClick={() => setTab('shopping')}><ShoppingBag size={18} /> الطلبات <span>{data.shopping.filter(s => !s.done).length}</span></button>
    </div>
    {tab === 'debts' ? <DebtList debts={data.debts} onDelete={id => onDelete('debts', id)} /> : <ShoppingList items={data.shopping} buyItem={buyItem} onDelete={id => onDelete('shopping', id)} />}
  </div>;
}

function DebtList({ debts, onDelete }) {
  if (!debts.length) return <Empty icon={HandCoins} title="لا توجد ديون" text="أضف دينًا وحدد موعده، واربط به أي عملية سداد." />;
  return <div className="commitment-list">{debts.map(d => {
    const percent = Math.min(100, Math.round((Number(d.paid) / Number(d.amount)) * 100));
    return <article className="debt-card" key={d.id}>
      <div className="debt-top"><div className="avatar">{d.person.slice(0, 1)}</div><div><strong>{d.person}</strong><small>{d.direction === 'owedToMe' ? 'لي عنده' : 'له عندي'} · يستحق {shortDate(d.due)}</small></div><button onClick={() => onDelete(d.id)} aria-label={`حذف دين ${d.person}`}><Trash2 size={17} /></button></div>
      <div className="debt-amount"><span>المتبقي</span><strong><bdi>{money(d.amount - d.paid)}</bdi></strong></div>
      <progress value={percent} max="100" aria-label={`تم سداد ${percent} بالمئة`} />
      <div className="debt-foot"><span>سُدّد <bdi>{money(d.paid)}</bdi></span><b>{percent}٪</b></div>
    </article>;
  })}</div>;
}

function ShoppingList({ items, buyItem, onDelete }) {
  if (!items.length) return <Empty icon={ShoppingBag} title="قائمة الطلبات فارغة" text="أضف ما تنوي شراءه مع ميزانيته المتوقعة." />;
  return <div className="shopping-list">{items.map(item => <article className={`shopping-row ${item.done ? 'done' : ''}`} key={item.id}>
    <button className="check-button" onClick={() => !item.done && buyItem(item)} aria-label={item.done ? `${item.title} تم شراؤه` : `شراء ${item.title} وإضافته للمصروفات`}><Check size={18} /></button>
    <div><strong>{item.title}</strong><small>{item.done ? 'أضيفت إلى العمليات' : 'التكلفة المتوقعة'}</small></div>
    <b><bdi>{money(item.estimate)}</bdi></b>
    <button className="delete-mini" onClick={() => onDelete(item.id)} aria-label={`حذف ${item.title}`}><Trash2 size={17} /></button>
  </article>)}</div>;
}

function SettingsView({ data, setData, setModal, notify }) {
  return <div className="view page-view settings-view">
    <PageTitle eyebrow="على طريقتك" title="الإعدادات" text="تحكّم بالحسابات والفئات والتنبيهات" />
    <SettingsSection title="الحسابات" icon={WalletCards} action={() => setModal('account')}>
      {data.accounts.map(a => <ManageRow key={a.id} color={a.color} title={a.name} subtitle={a.type} value={money(a.balance)} onDelete={() => setData(p => ({ ...p, accounts: p.accounts.filter(x => x.id !== a.id) }))} />)}
    </SettingsSection>
    <SettingsSection title="الفئات" icon={Tag} action={() => setModal('category')}>
      {data.categories.map(c => <ManageRow key={c.id} title={c.name} subtitle={c.kind === 'income' ? 'دخل' : 'مصروف'} onDelete={() => setData(p => ({ ...p, categories: p.categories.filter(x => x.id !== c.id) }))} />)}
    </SettingsSection>
    <button className="notification-setting" onClick={() => setModal('notifications')}><span><Bell size={20} /></span><div><strong>تنبيهات المواعيد</strong><small>ذكّرني بمواعيد الديون</small></div><ChevronLeft size={20} /></button>
    <button className="reset-button" onClick={() => { if (confirm('هل تريد إعادة البيانات التجريبية؟')) { setData(initialData); notify('تمت إعادة البيانات'); } }}>إعادة البيانات التجريبية</button>
  </div>;
}

function SettingsSection({ title, icon: Icon, action, children }) {
  return <section className="settings-card"><div className="settings-card-head"><div><Icon size={19} /><h2>{title}</h2></div><button onClick={action}><Plus size={16} /> إضافة</button></div><div>{children}</div></section>;
}

function ManageRow({ color, title, subtitle, value, onDelete }) {
  return <div className="manage-row"><i style={{ background: color || '#d6a868' }} /><div><strong>{title}</strong><small>{subtitle}</small></div>{value && <b><bdi>{value}</bdi></b>}<button onClick={onDelete} aria-label={`حذف ${title}`}><Trash2 size={17} /></button></div>;
}

function Empty({ icon: Icon, title, text }) {
  return <div className="empty-state"><span><Icon size={28} /></span><strong>{title}</strong><p>{text}</p></div>;
}

function PageTitle({ eyebrow, title, text }) {
  return <div className="page-title"><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>;
}

function Modal({ type, data, setData, onClose, onTransaction, notify }) {
  const dialogRef = useRef(null);
  const previousFocus = useRef(document.activeElement);
  useEffect(() => {
    dialogRef.current?.focus();
    const handleKey = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previousFocus.current?.focus(); };
  }, [onClose]);

  const titles = { transaction: 'عملية جديدة', incomeTransaction: 'إضافة دخل', expenseTransaction: 'إضافة مصروف', debt: 'إضافة دين', shopping: 'إضافة طلب', account: 'حساب جديد', category: 'فئة جديدة', notifications: 'التنبيهات' };
  const isTransaction = ['transaction', 'incomeTransaction', 'expenseTransaction'].includes(type);
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="modal-sheet" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex="-1">
      <div className="sheet-handle" aria-hidden="true" />
      <div className="modal-head"><div><span>ميزان</span><h2 id="modal-title">{titles[type]}</h2></div><button onClick={onClose} aria-label="إغلاق"><X size={21} /></button></div>
      {isTransaction && <TransactionForm data={data} initialType={type === 'incomeTransaction' ? 'income' : 'expense'} lockType={type !== 'transaction'} onSubmit={values => { onTransaction(values); onClose(); }} />}
      {type === 'debt' && <DebtForm onSubmit={values => { setData(p => ({ ...p, debts: [{ id: uid('d'), paid: 0, ...values }, ...p.debts] })); notify('تمت إضافة الدين'); onClose(); }} />}
      {type === 'shopping' && <ShoppingForm onSubmit={values => { setData(p => ({ ...p, shopping: [{ id: uid('s'), done: false, ...values }, ...p.shopping] })); notify('أُضيف الطلب للقائمة'); onClose(); }} />}
      {type === 'account' && <AccountForm onSubmit={values => { setData(p => ({ ...p, accounts: [...p.accounts, { id: uid('a'), ...values }] })); notify('تمت إضافة الحساب'); onClose(); }} />}
      {type === 'category' && <CategoryForm onSubmit={values => { setData(p => ({ ...p, categories: [...p.categories, { id: uid('c'), icon: values.kind === 'income' ? 'دخل' : 'مصروف', ...values }] })); notify('تمت إضافة الفئة'); onClose(); }} />}
      {type === 'notifications' && <NotificationPanel notify={notify} onClose={onClose} />}
    </section>
  </div>;
}

function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
function SubmitButton({ children }) { return <button className="submit-button" type="submit">{children}<ChevronLeft size={19} /></button>; }

function TransactionForm({ data, initialType = 'expense', lockType = false, onSubmit }) {
  const [form, setForm] = useState({ type: initialType, title: '', amount: '', accountId: data.accounts[0]?.id || '', categoryId: data.categories.find(c => c.kind === initialType)?.id || '', isDebt: false, debtId: '' });
  const update = (key, value) => setForm(p => ({ ...p, [key]: value }));
  const categories = data.categories.filter(c => c.kind === form.type);
  useEffect(() => { if (!categories.some(c => c.id === form.categoryId)) update('categoryId', categories[0]?.id || ''); }, [form.type]);
  return <form className="form" onSubmit={e => { e.preventDefault(); const { isDebt, ...values } = form; onSubmit({ ...values, amount: Number(form.amount), debtId: isDebt ? form.debtId : undefined }); }}>
    {!lockType && <div className="segmented"><button type="button" className={form.type === 'expense' ? 'active' : ''} onClick={() => update('type','expense')}>مصروف</button><button type="button" className={form.type === 'income' ? 'active' : ''} onClick={() => update('type','income')}>دخل</button></div>}
    <Field label="اسم العملية"><input required value={form.title} onChange={e => update('title', e.target.value)} placeholder="مثال: فاتورة الكهرباء" /></Field>
    <Field label="المبلغ"><div className="amount-input"><input required min="0.01" step="0.01" type="number" inputMode="decimal" value={form.amount} onChange={e => update('amount', e.target.value)} placeholder="0" /><span>ر.س</span></div></Field>
    <div className="field-row"><Field label="الحساب"><select required value={form.accountId} onChange={e => update('accountId', e.target.value)}>{data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field><Field label="الفئة"><select required value={form.categoryId} onChange={e => update('categoryId', e.target.value)}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field></div>
    <label className="debt-toggle">
      <span className="toggle-copy"><span className="toggle-icon"><HandCoins size={19} /></span><span><strong>هذه العملية مرتبطة بدين</strong><small>فعّلها إذا كان المبلغ سدادًا أو تحصيلًا لدين</small></span></span>
      <span className="switch"><input type="checkbox" checked={form.isDebt} onChange={e => update('isDebt', e.target.checked)} aria-controls="debt-picker" /><span aria-hidden="true" /></span>
    </label>
    {form.isDebt && <div id="debt-picker">{data.debts.length > 0 ? <Field label="اختر الدين"><select required value={form.debtId} onChange={e => update('debtId', e.target.value)}><option value="" disabled>حدد الدين المرتبط</option>{data.debts.map(d => <option key={d.id} value={d.id}>{d.person} — متبقي {money(d.amount - d.paid)}</option>)}</select><small className="hint">عند الحفظ سيُحدّث المبلغ المسدد تلقائيًا.</small></Field> : <p className="form-note"><HandCoins size={18} />لا يوجد دين مسجل. أضف دينًا أولًا من صفحة الالتزامات.</p>}</div>}
    <SubmitButton>حفظ العملية</SubmitButton>
  </form>;
}

function DebtForm({ onSubmit }) {
  const [form, setForm] = useState({ person: '', amount: '', direction: 'iOwe', due: new Date(Date.now() + 7*86400000).toISOString().slice(0,10), note: '' });
  return <form className="form" onSubmit={e => { e.preventDefault(); onSubmit({ ...form, amount: Number(form.amount) }); }}>
    <Field label="اسم الشخص"><input required value={form.person} onChange={e => setForm(p => ({...p, person:e.target.value}))} placeholder="اسم الشخص أو الجهة" /></Field>
    <Field label="المبلغ"><div className="amount-input"><input required min="1" type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount:e.target.value}))} placeholder="0" /><span>ر.س</span></div></Field>
    <div className="segmented"><button type="button" className={form.direction === 'iOwe' ? 'active' : ''} onClick={() => setForm(p => ({...p,direction:'iOwe'}))}>له عندي</button><button type="button" className={form.direction === 'owedToMe' ? 'active' : ''} onClick={() => setForm(p => ({...p,direction:'owedToMe'}))}>لي عنده</button></div>
    <Field label="موعد الاستحقاق"><input required type="date" value={form.due} onChange={e => setForm(p => ({...p,due:e.target.value}))} /></Field>
    <Field label="ملاحظة"><input value={form.note} onChange={e => setForm(p => ({...p,note:e.target.value}))} placeholder="اختياري" /></Field>
    <SubmitButton>إضافة الدين</SubmitButton>
  </form>;
}

function ShoppingForm({ onSubmit }) {
  const [form, setForm] = useState({ title: '', estimate: '' });
  return <form className="form" onSubmit={e => { e.preventDefault(); onSubmit({ ...form, estimate: Number(form.estimate) }); }}><Field label="ماذا تريد شراءه؟"><input required value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} placeholder="مثال: سماعات جديدة" /></Field><Field label="التكلفة المتوقعة"><div className="amount-input"><input required min="1" type="number" value={form.estimate} onChange={e => setForm(p=>({...p,estimate:e.target.value}))} placeholder="0" /><span>ر.س</span></div></Field><p className="form-note"><ShoppingBag size={18} />عند تأكيد الشراء ستُضاف القيمة إلى المصروفات مباشرة.</p><SubmitButton>إضافة للقائمة</SubmitButton></form>;
}

function AccountForm({ onSubmit }) {
  const [form, setForm] = useState({ name: '', type: 'نقدي', balance: '', color: '#286a5c' });
  return <form className="form" onSubmit={e => { e.preventDefault(); onSubmit({ ...form, balance:Number(form.balance) }); }}><Field label="اسم الحساب"><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="مثال: محفظتي" /></Field><div className="field-row"><Field label="النوع"><select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}><option>نقدي</option><option>بنكي</option><option>بطاقة</option><option>ادخار</option></select></Field><Field label="الرصيد الافتتاحي"><input required type="number" value={form.balance} onChange={e=>setForm(p=>({...p,balance:e.target.value}))} placeholder="0" /></Field></div><Field label="لون الحساب"><div className="color-row">{['#286a5c','#b36b45','#3e5c76','#7a5969'].map(c=><button key={c} type="button" aria-label={`اختيار اللون ${c}`} className={form.color===c?'active':''} style={{background:c}} onClick={()=>setForm(p=>({...p,color:c}))} />)}</div></Field><SubmitButton>حفظ الحساب</SubmitButton></form>;
}

function CategoryForm({ onSubmit }) {
  const [form,setForm]=useState({name:'',kind:'expense'});
  return <form className="form" onSubmit={e=>{e.preventDefault();onSubmit(form)}}><Field label="اسم الفئة"><input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="مثال: تعليم" /></Field><div className="segmented"><button type="button" className={form.kind==='expense'?'active':''} onClick={()=>setForm(p=>({...p,kind:'expense'}))}>مصروف</button><button type="button" className={form.kind==='income'?'active':''} onClick={()=>setForm(p=>({...p,kind:'income'}))}>دخل</button></div><SubmitButton>حفظ الفئة</SubmitButton></form>;
}

function NotificationPanel({ notify, onClose }) {
  const [permission, setPermission] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const enable = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission(); setPermission(result);
    if (result === 'granted') { new Notification('ميزان جاهز', { body: 'سنذكّرك بمواعيدك المالية المهمة.', icon: '/icon.svg' }); notify('تم تفعيل الإشعارات'); onClose(); }
  };
  return <div className="notification-panel"><span className="bell-hero"><Bell size={34} /></span><h3>{permission === 'granted' ? 'الإشعارات مفعّلة' : 'لا تنسَ مواعيدك المالية'}</h3><p>اسمح لميزان بإرسال تذكير قبل استحقاق الديون والمواعيد المهمة.</p>{permission !== 'granted' && permission !== 'unsupported' && <button className="submit-button" onClick={enable}>تفعيل الإشعارات <ChevronLeft size={19} /></button>}{permission === 'unsupported' && <p className="warning">متصفحك لا يدعم الإشعارات. ثبّت التطبيق أو استخدم Chrome على أندرويد.</p>}{permission === 'denied' && <p className="warning">الإذن مرفوض. يمكنك السماح به من إعدادات الموقع في المتصفح.</p>}</div>;
}

export default App;

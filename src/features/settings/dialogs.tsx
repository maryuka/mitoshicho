import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CloseIcon from '@mui/icons-material/Close';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, InputAdornment, ListItemIcon, ListItemText, ListSubheader, Menu, MenuItem,
  Stack, TextField, Typography,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import { countBetween, endAfterCount, itemArchivePatch, itemSchedule, type ScheduleRow } from '../../domain/items';
import { addPeriods, comparePeriods, periodFromLabel, periodYearLabel, periodRule, type StartDay } from '../../domain/period';
import type { Account, AmountChange, AppData, Category, CategoryKind, ChecklistTemplate, HolidayShift, Item, Recurrence } from '../../domain/types';
import { db, newId } from '../../db/db';
import { patchEntry } from '../../db/ops';
import { MoneyField } from '../../components/MoneyField';
import { confirmDialog } from '../../components/ConfirmDialog';
import { canAutoFocus } from '../../lib/device';
import { yen } from '../../lib/money';

export const KIND_LABEL: Record<CategoryKind, string> = { income: '収入', expense: '支出', debt: '返済', saving: '貯金・投資' };
const nextOrder = (xs: { sortOrder: number }[]) => (xs.length ? Math.max(...xs.map((x) => x.sortOrder)) + 1 : 0);

/** ダイアログのタイトル。編集のときは右上の「⋮」からアーカイブ・削除を選ぶ */
function Title({ text, archived, onArchive, onDelete, archiveHint, unarchiveHint, deleteHint, actions }: {
  text: string; archived?: boolean; onArchive?: (archived: boolean) => void; onDelete?: () => void;
  /** 「⋮」の左に置くボタン */
  actions?: ReactNode;
  /** メニューの各操作の下に出す説明 */
  archiveHint?: string; unarchiveHint?: string; deleteHint?: string;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const hasMenu = !!(onArchive || onDelete);
  return (
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: hasMenu || actions ? 1.5 : 3 }}>
      <Box component="span" sx={{ flex: 1, minWidth: 0 }}>{text}</Box>
      {actions}
      {hasMenu && (
        <>
          <IconButton aria-label="その他の操作" onClick={(e) => setAnchor(e.currentTarget)} sx={{ color: 'text.secondary' }}>
            <MoreVertIcon />
          </IconButton>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { maxWidth: 300 } } }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
            {onArchive && (
              <MenuItem onClick={() => { setAnchor(null); onArchive(!archived); }} sx={{ alignItems: 'flex-start', whiteSpace: 'normal' }}>
                <ListItemIcon sx={{ mt: 0.75 }}>{archived ? <UnarchiveOutlinedIcon fontSize="small" /> : <ArchiveOutlinedIcon fontSize="small" />}</ListItemIcon>
                <ListItemText primary={archived ? '使用中に戻す' : 'アーカイブ'} secondary={archived ? unarchiveHint : archiveHint} />
              </MenuItem>
            )}
            {onDelete && (
              <MenuItem onClick={() => { setAnchor(null); onDelete(); }} sx={{ color: 'error.main', alignItems: 'flex-start', whiteSpace: 'normal' }}>
                <ListItemIcon sx={{ color: 'inherit', mt: 0.75 }}><DeleteOutlineIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="削除" secondary={deleteHint} />
              </MenuItem>
            )}
          </Menu>
        </>
      )}
    </DialogTitle>
  );
}

function Actions({ onSave, onClose, valid }: { onSave: () => void; onClose: () => void; valid: boolean }) {
  return (
    <DialogActions sx={{ '& .MuiButton-root': { whiteSpace: 'nowrap' } }}>
      <Button onClick={onClose}>キャンセル</Button>
      <Button variant="contained" disabled={!valid} onClick={onSave} sx={{ px: 3 }}>保存</Button>
    </DialogActions>
  );
}

export function AccountDialog({ value, data, onClose }: { value?: Account; data: AppData; onClose: () => void }) {
  const [name, setName] = useState(value?.name ?? '');
  const [kind, setKind] = useState<Account['kind']>(value?.kind ?? 'bank');
  const [withdrawDay, setWithdrawDay] = useState<number | undefined>(value?.withdrawDay ?? 26);
  const [confirmDay, setConfirmDay] = useState<number | undefined>(value?.confirmDay);
  // 新しく追加するカードは、多くのカードと同じ「後の平日」にしておく
  const [withdrawShift, setWithdrawShift] = useState<HolidayShift>(value ? value.withdrawShift ?? 'none' : 'after');
  const [withdrawAccountId, setWithdrawAccountId] = useState(value?.withdrawAccountId ?? '');
  const [lag, setLag] = useState(value?.billLagPeriods ?? 1);
  const banks = data.accounts.filter((a) => a.kind === 'bank' && a.id !== value?.id);
  const valid = name.trim() !== '';

  const save = async () => {
    const base = { id: value?.id ?? newId(), name: name.trim(), kind, sortOrder: value?.sortOrder ?? nextOrder(data.accounts), archived: value?.archived ?? false };
    await db.accounts.put(kind === 'card'
      ? { ...base, withdrawDay, withdrawShift, confirmDay, withdrawAccountId: withdrawAccountId || undefined, billLagPeriods: lag }
      : base);
    onClose();
  };
  return (
    <Dialog open onClose={onClose}>
      <Title text={value ? '口座・カードを編集' : '口座・カードを追加'} archived={value?.archived}
        archiveHint="一覧と選択肢から隠す。登録済みの定期項目や過去の記録はそのまま"
        onArchive={value && (async (a) => { await db.accounts.update(value.id, { archived: a }); onClose(); })} />
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField id="acc-name" label="名前" value={name} onChange={(e) => setName(e.target.value)} autoFocus={canAutoFocus} fullWidth />
          <TextField id="acc-kind" select label="種類" value={kind} onChange={(e) => setKind(e.target.value as Account['kind'])} fullWidth>
            <MenuItem value="bank">銀行口座</MenuItem>
            <MenuItem value="card">クレジットカード</MenuItem>
          </TextField>
          {kind === 'card' && (
            <>
              <Stack direction="row" spacing={1}>
                <DayField id="acc-withdraw-day" label="引落日（毎月）" value={withdrawDay} onChange={setWithdrawDay} />
                <DayField id="acc-confirm-day" label="請求確定日（毎月）" value={confirmDay} onChange={setConfirmDay} />
              </Stack>
              <TextField id="acc-withdraw-shift" select label="引落日が土日・祝日のとき" value={withdrawShift}
                onChange={(e) => setWithdrawShift(e.target.value as HolidayShift)} fullWidth>
                <MenuItem value="after">後の平日にずらす</MenuItem>
                <MenuItem value="before">前の平日にずらす</MenuItem>
                <MenuItem value="none">ずらさない</MenuItem>
              </TextField>
              <Typography variant="caption" color="text.secondary">
                確定日になるとホームに「請求額を入力」が出ます。月ごとにずれる場合は、その月の請求を開いて日付を変えられます。
              </Typography>
              <TextField id="acc-withdraw-account" select label="引落口座" value={withdrawAccountId} onChange={(e) => setWithdrawAccountId(e.target.value)} fullWidth>
                <MenuItem value="">（未設定）</MenuItem>
                {banks.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
              <TextField id="acc-lag" select label="請求のタイミング" value={lag} onChange={(e) => setLag(Number(e.target.value))} fullWidth>
                <MenuItem value={0}>使った月と同じ月に引落</MenuItem>
                <MenuItem value={1}>使った月の翌月に引落</MenuItem>
                <MenuItem value={2}>使った月の2か月後に引落</MenuItem>
              </TextField>
            </>
          )}
        </Stack>
      </DialogContent>
      <Actions valid={valid} onSave={save} onClose={onClose} />
    </Dialog>
  );
}

function DayField({ id, label, value, onChange }: { id: string; label: string; value?: number; onChange: (v?: number) => void }) {
  return (
    <TextField id={id} select label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} fullWidth>
      <MenuItem value="">（未設定）</MenuItem>
      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <MenuItem key={d} value={d}>{d}日</MenuItem>)}
    </TextField>
  );
}

export function CategoryDialog({ value, data, onClose }: { value?: Category; data: AppData; onClose: () => void }) {
  const [name, setName] = useState(value?.name ?? '');
  const [kind, setKind] = useState<CategoryKind>(value?.kind ?? 'expense');
  const valid = name.trim() !== '';
  const save = async () => {
    await db.categories.put({ id: value?.id ?? newId(), name: name.trim(), kind, sortOrder: value?.sortOrder ?? nextOrder(data.categories), archived: value?.archived ?? false });
    onClose();
  };
  return (
    <Dialog open onClose={onClose}>
      <Title text={value ? 'カテゴリを編集' : 'カテゴリを追加'} archived={value?.archived}
        archiveHint="一覧と選択肢から隠す。中の定期項目や過去の実績はそのまま"
        onArchive={value && (async (a) => { await db.categories.update(value.id, { archived: a }); onClose(); })} />
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField id="cat-name" label="名前（家計簿アプリのカテゴリ名に合わせると振り返りが楽です）" value={name} onChange={(e) => setName(e.target.value)} autoFocus={canAutoFocus} fullWidth />
          <TextField id="cat-kind" select label="種類" value={kind} onChange={(e) => setKind(e.target.value as CategoryKind)} fullWidth>
            {(Object.keys(KIND_LABEL) as CategoryKind[]).map((k) => <MenuItem key={k} value={k}>{KIND_LABEL[k]}</MenuItem>)}
          </TextField>
        </Stack>
      </DialogContent>
      <Actions valid={valid} onSave={save} onClose={onClose} />
    </Dialog>
  );
}

/** 支払い元（収入なら入金先）。収入は銀行口座だけ、それ以外は口座とカードから選ぶ */
function SourceField({ data, kind, value, onChange }: {
  data: AppData; kind?: CategoryKind; value: string; onChange: (v: string) => void;
}) {
  const accounts = data.accounts.filter((a) => (!a.archived || a.id === value) && (kind !== 'income' || a.kind === 'bank'));
  return (
    <TextField id="item-source" select label={kind === 'income' ? '入金先' : '支払い元'} value={value} onChange={(e) => onChange(e.target.value)} fullWidth
      helperText={kind === 'income' ? undefined : 'カードを選ぶと翌月のカード請求の予測に入ります'}>
      <MenuItem value="">（未設定）</MenuItem>
      {accounts.some((a) => a.kind === 'bank') && <ListSubheader>銀行口座</ListSubheader>}
      {accounts.filter((a) => a.kind === 'bank').map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
      {accounts.some((a) => a.kind === 'card') && <ListSubheader>カード</ListSubheader>}
      {accounts.filter((a) => a.kind === 'card').map((a) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
    </TextField>
  );
}

/** 計画で足した「この月だけ」の項目を直す。金額・支払い元・入出金日 */
export function OnceItemDialog({ value, planned, data, onClose }: {
  value: Item; planned: number; data: AppData; onClose: () => void;
}) {
  const [name, setName] = useState(value.name);
  const [amount, setAmount] = useState<number | undefined>(planned);
  const [source, setSource] = useState(value.sourceAccountId ?? '');
  const [day, setDay] = useState<number | undefined>(value.day);
  const kind = data.categories.find((c) => c.id === value.categoryId)?.kind;
  const valid = name.trim() !== '' && amount !== undefined;
  const periodId = value.recurrence.type === 'once' ? value.recurrence.periodId : value.startPeriod;
  const save = async () => {
    if (!valid) return;
    await db.transaction('rw', db.items, db.entries, async () => {
      await db.items.update(value.id, { name: name.trim(), defaultAmount: amount!, sourceAccountId: source || undefined, day });
      // 金額は項目そのものに持たせ、この月の上書きは消す（メモは残す）
      await patchEntry(periodId, value.id, { planned: null });
    });
    onClose();
  };
  const remove = async () => {
    if (!await confirmDialog(`この月だけの項目「${value.name}」を消します。よろしいですか？`)) return;
    await db.transaction('rw', db.items, db.entries, async () => {
      await db.entries.where('itemId').equals(value.id).delete();
      await db.items.delete(value.id);
    });
    onClose();
  };
  return (
    <Dialog open onClose={onClose}>
      <Title text="この月だけの項目" onDelete={remove} deleteHint="この月の予算から消す。元に戻せない" />
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField id="once-edit-name" label="名前" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <MoneyField id="once-edit-amount" label="金額" value={amount} onChange={setAmount} fullWidth />
          <SourceField data={data} kind={kind} value={source} onChange={setSource} />
          <DayField id="once-edit-day" label="入出金日（任意・予定の表示用）" value={day} onChange={setDay} />
        </Stack>
      </DialogContent>
      <Actions valid={valid} onSave={save} onClose={onClose} />
    </Dialog>
  );
}

export function ItemDialog({ value, data, current, onClose }: { value?: Item; data: AppData; current: string; onClose: () => void }) {
  const startDay = periodRule(data.settings);
  const cats = data.categories.filter((c) => !c.archived || c.id === value?.categoryId).sort((a, b) => a.sortOrder - b.sortOrder);
  const [name, setName] = useState(value?.name ?? '');
  const [categoryId, setCategoryId] = useState(value?.categoryId ?? cats[0]?.id ?? '');
  const [amount, setAmount] = useState<number | undefined>(value?.defaultAmount);
  // 途中からの金額の変更（家賃の改定など）。金額が空の行は保存しない
  const [changes, setChanges] = useState<{ from: string; amount?: number }[]>(value?.amountChanges ?? []);
  const [day, setDay] = useState<number | undefined>(value?.day);
  const [source, setSource] = useState(value?.sourceAccountId ?? '');
  const [recType, setRecType] = useState<Recurrence['type']>(value?.recurrence.type ?? 'monthly');
  const [month, setMonth] = useState(value?.recurrence.type === 'yearly' ? value.recurrence.month : 1);
  const [intervalMonths, setIntervalMonths] = useState(value?.recurrence.type === 'interval' ? value.recurrence.months : 2);
  const [once, setOnce] = useState(value?.recurrence.type === 'once' ? value.recurrence.periodId : current);
  const [startPeriod, setStartPeriod] = useState(value?.startPeriod ?? current);
  const [endPeriod, setEndPeriod] = useState(value?.endPeriod ?? '');
  // 終わり方: ずっと続ける／終了月で決める／回数で決める（回数は終了月に直して保存する）
  const [endMode, setEndMode] = useState<'none' | 'month' | 'count'>(
    !value?.endPeriod ? 'none' : value.endBy === 'count' ? 'count' : 'month');
  // 回数で決めていた項目は、保存してある終了月から回数を出して入れておく
  const [showSchedule, setShowSchedule] = useState(false);
  const [countText, setCountText] = useState(value?.endPeriod && value.endBy === 'count'
    ? String(countBetween({ recurrence: value.recurrence, startPeriod: value.startPeriod }, value.endPeriod)) : '');
  const options = Array.from({ length: 49 }, (_, i) => addPeriods(current, i - 24));
  const withValue = (v: string) => (v && !options.includes(v) ? [v, ...options] : options);
  const kind = data.categories.find((c) => c.id === categoryId)?.kind;

  const recurrence: Recurrence = recType === 'monthly' ? { type: 'monthly' }
    : recType === 'interval' ? { type: 'interval', months: intervalMonths }
    : recType === 'yearly' ? { type: 'yearly', month } : { type: 'once', periodId: once };
  const schedule = { recurrence, startPeriod };
  const countEnd = endMode === 'count' ? endAfterCount(schedule, Number(countText)) : undefined;
  const finalEnd = recType === 'once' || endMode === 'none' ? '' : endMode === 'count' ? countEnd ?? '' : endPeriod;
  const valid = name.trim() !== '' && amount !== undefined && categoryId !== ''
    && (recType === 'once' || endMode !== 'count' || countEnd !== undefined);
  const changeEndMode = (m: typeof endMode) => {
    // 終了月が決まっていれば、回数に切り替えたときにその回数を入れておく
    if (m === 'count' && endPeriod) setCountText(String(countBetween(schedule, endPeriod)));
    if (m === 'month' && countEnd) setEndPeriod(countEnd);
    setEndMode(m);
  };

  const save = async () => {
    if (!valid) return;
    await db.items.put({
      id: value?.id ?? newId(), name: name.trim(), categoryId, defaultAmount: amount!, day,
      amountChanges: recType === 'once' ? undefined : cleanChanges(changes, startPeriod),
      sourceAccountId: source || undefined, recurrence,
      startPeriod: recType === 'once' ? once : startPeriod,
      endPeriod: recType === 'once' ? once : finalEnd || undefined,
      endBy: recType !== 'once' && endMode === 'count' && finalEnd ? 'count' : undefined,
      sortOrder: value?.sortOrder ?? nextOrder(data.items), archived: value?.archived ?? false,
      // 終了月を自分で変えたら、アーカイブ前の終了月の記録は使わない
      endBeforeArchive: (finalEnd || undefined) === value?.endPeriod ? value?.endBeforeArchive : undefined,
    });
    onClose();
  };
  const remove = async () => {
    if (!value) return;
    if (!await confirmDialog(`「${value.name}」と、その月ごとの予算の変更をすべて削除します。よろしいですか？`)) return;
    await db.transaction('rw', db.items, db.entries, async () => {
      await db.entries.where('itemId').equals(value.id).delete();
      await db.items.delete(value.id);
    });
    onClose();
  };
  // 終了月の選択肢は開始月から。開始月を終了月より後にしたら、終了月を空に戻す
  const changeStart = (s: string) => {
    setStartPeriod(s);
    if (endPeriod && comparePeriods(endPeriod, s) < 0) { setEndPeriod(''); if (endMode === 'month') setEndMode('none'); }
  };
  const monthSelect = (id: string, label: string, v: string, set: (s: string) => void, allowEmpty = false, from?: string) => (
    <TextField id={id} select label={label} value={v} onChange={(e) => set(e.target.value)} fullWidth>
      {allowEmpty && <MenuItem value="">（なし）</MenuItem>}
      {withValue(v).filter((p) => !from || comparePeriods(p, from) >= 0)
        .map((p) => <MenuItem key={p} value={p}>{periodYearLabel(p, startDay)}</MenuItem>)}
    </TextField>
  );

  return (
    <Dialog open onClose={onClose}>
      <Title text={value ? '定期項目を編集' : '定期項目を追加'} archived={value?.archived}
        actions={(
          <IconButton aria-label="月ごとの金額を見る" title="月ごとの金額を見る" onClick={() => setShowSchedule(true)} sx={{ color: 'text.secondary' }}>
            <CalendarMonthOutlinedIcon />
          </IconButton>
        )}
        archiveHint="今月までで止める。来月から予算に入らず、過去の月はそのまま残る"
        unarchiveHint="アーカイブ前の終了月に戻して、また予算に入れる"
        deleteHint="過去の月も含めて、すべての予算から消す。元に戻せない"
        onArchive={value && (async (a) => { await db.items.update(value.id, itemArchivePatch(value, a, current)); onClose(); })}
        onDelete={value && remove} />
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField id="item-name" label="名前" value={name} onChange={(e) => setName(e.target.value)} autoFocus={canAutoFocus} fullWidth />
          <TextField id="item-category" select label="カテゴリ" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} fullWidth>
            {cats.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}（{KIND_LABEL[c.kind]}）</MenuItem>)}
          </TextField>
          <SourceField data={data} kind={kind} value={source} onChange={setSource} />
          <DayField id="item-day" label="入出金日（任意・予定の表示用）" value={day} onChange={setDay} />
          <TextField id="item-recurrence" select label="頻度" value={recType} onChange={(e) => setRecType(e.target.value as Recurrence['type'])} fullWidth>
            <MenuItem value="monthly">毎月</MenuItem>
            <MenuItem value="interval">数か月に1回</MenuItem>
            <MenuItem value="yearly">毎年（年会費など）</MenuItem>
          </TextField>
          {recType === 'interval' && (
            <TextField id="item-interval" select label="何か月に1回か" value={intervalMonths} onChange={(e) => setIntervalMonths(Number(e.target.value))} fullWidth
              helperText="開始月から数えます">
              {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => <MenuItem key={n} value={n}>{n}か月に1回</MenuItem>)}
            </TextField>
          )}
          {recType === 'yearly' && (
            <TextField id="item-month" select label="何月か" value={month} onChange={(e) => setMonth(Number(e.target.value))} fullWidth>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <MenuItem key={m} value={m}>{m}月</MenuItem>)}
            </TextField>
          )}
          {recType === 'once'
            ? (
              <>
                {monthSelect('item-once', '月', once, setOnce)}
                <MoneyField id="item-amount" label="金額" value={amount} onChange={setAmount} fullWidth />
              </>
            )
            : (
              <>
                {monthSelect('item-start', '開始月', startPeriod, changeStart)}
                {/* 最初の金額と途中からの変更を、時間の順に並べる */}
                <MoneyField id="item-amount" label={changes.length ? `金額（${periodFromLabel(startPeriod, startDay)}）` : '金額（毎回の予算）'}
                  value={amount} onChange={setAmount} fullWidth />
                <AmountChanges changes={changes} onChange={setChanges} months={withValue('').filter((p) => comparePeriods(p, startPeriod) > 0)}
                  label={(p) => periodFromLabel(p, startDay)} />
                <TextField id="item-end-mode" select label="終了月" value={endMode} fullWidth
                  onChange={(e) => changeEndMode(e.target.value as typeof endMode)}>
                  <MenuItem value="none">なし（ずっと続ける）</MenuItem>
                  <MenuItem value="month">月で決める</MenuItem>
                  <MenuItem value="count">回数で決める（分割払いなど）</MenuItem>
                </TextField>
                {endMode === 'month' && monthSelect('item-end', '最終回の月', endPeriod, setEndPeriod, false, startPeriod)}
                {endMode === 'count' && (
                  <TextField id="item-count" label="回数" value={countText} fullWidth
                    onChange={(e) => setCountText(e.target.value.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\D/g, ''))}
                    slotProps={{ htmlInput: { inputMode: 'numeric' }, input: { endAdornment: <InputAdornment position="end">回</InputAdornment> } }}
                    error={countText !== '' && !countEnd}
                    helperText={countEnd ? `最終回は ${periodYearLabel(countEnd, startDay)}` : '開始月から数えて何回か'} />
                )}
              </>
            )}
        </Stack>
      </DialogContent>
      <Actions valid={valid} onSave={save} onClose={onClose} />
      {showSchedule && (
        <ScheduleDialog name={name || '定期項目'} startDay={startDay} onClose={() => setShowSchedule(false)}
          rows={itemSchedule({
            id: value?.id ?? '', name, categoryId, defaultAmount: amount ?? 0, recurrence, startPeriod: recType === 'once' ? once : startPeriod,
            endPeriod: recType === 'once' ? once : finalEnd || undefined, amountChanges: recType === 'once' ? undefined : cleanChanges(changes, startPeriod),
            sortOrder: 0, archived: false,
          }, value ? data.entries : [], addPeriods(current, -12))} />
      )}
    </Dialog>
  );
}

/** 金額が空の行・開始月以前の行を除き、同じ月は後の行を残して、月の古い順に並べる */
function cleanChanges(rows: { from: string; amount?: number }[], start: string): AmountChange[] | undefined {
  const byMonth = new Map<string, number>();
  for (const r of rows) if (r.amount !== undefined && comparePeriods(r.from, start) > 0) byMonth.set(r.from, r.amount);
  const list = [...byMonth].map(([from, amount]) => ({ from, amount })).sort((a, b) => comparePeriods(a.from, b.from));
  return list.length ? list : undefined;
}

/** 「途中から金額を変える」の入力。月と金額の組を並べる */
function AmountChanges({ changes, onChange, months, label }: {
  changes: { from: string; amount?: number }[]; onChange: (c: { from: string; amount?: number }[]) => void;
  months: string[]; label: (p: string) => string;
}) {
  const set = (i: number, patch: Partial<{ from: string; amount?: number }>) =>
    onChange(changes.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const add = () => {
    const used = new Set(changes.map((c) => c.from));
    const from = months.find((m) => !used.has(m) && (!changes.length || comparePeriods(m, changes[changes.length - 1].from) > 0)) ?? months[0];
    if (from) onChange([...changes, { from, amount: undefined }]);
  };
  return (
    <Stack spacing={1.5}>
      {changes.map((c, i) => (
        <Stack key={i} direction="row" spacing={0.5} alignItems="flex-start">
          {/* 幅が足りないときは月と金額を2段にする。消すボタンは右に置いたまま */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <TextField id={`item-change-from-${i}`} select label="この月から" value={c.from} onChange={(e) => set(i, { from: e.target.value })}
              sx={{ flex: '1 1 160px' }}>
              {(months.includes(c.from) ? months : [c.from, ...months]).map((p) => <MenuItem key={p} value={p}>{label(p)}</MenuItem>)}
            </TextField>
            <MoneyField id={`item-change-amount-${i}`} label="金額" value={c.amount} onChange={(v) => set(i, { amount: v })} sx={{ flex: '1 1 110px' }} />
          </Box>
          <IconButton aria-label="この変更を消す" onClick={() => onChange(changes.filter((_, j) => j !== i))} sx={{ mt: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      {months.length > 0 && (
        <Button size="small" startIcon={<AddIcon />} onClick={add} sx={{ alignSelf: 'flex-start' }}>途中から金額を変える</Button>
      )}
    </Stack>
  );
}

/** 給料日のチェックリストの項目（繰り返すもの）。「今月だけ」は給料日の画面から足す */
export function ChecklistDialog({ value, data, current, onClose }: {
  value?: ChecklistTemplate; data: AppData; current: string; onClose: () => void;
}) {
  const startDay = periodRule(data.settings);
  const r = value?.recurrence ?? { type: 'monthly' as const };
  const [label, setLabel] = useState(value?.label ?? '');
  const [recType, setRecType] = useState<'monthly' | 'interval' | 'yearly'>(r.type === 'once' ? 'monthly' : r.type);
  const [months, setMonths] = useState(r.type === 'interval' ? r.months : 2);
  const [month, setMonth] = useState(r.type === 'yearly' ? r.month : 1);
  const [startPeriod, setStartPeriod] = useState(value?.startPeriod ?? current);
  const [endPeriod, setEndPeriod] = useState(value?.endPeriod ?? '');
  const options = Array.from({ length: 49 }, (_, i) => addPeriods(current, i - 24));
  const withValue = (v: string) => (v && !options.includes(v) ? [v, ...options] : options);
  const valid = label.trim() !== '';

  const save = async () => {
    if (!valid) return;
    const recurrence: Recurrence = recType === 'monthly' ? { type: 'monthly' }
      : recType === 'interval' ? { type: 'interval', months } : { type: 'yearly', month };
    await db.checklistTemplates.put({
      id: value?.id ?? newId(), label: label.trim(), sortOrder: value?.sortOrder ?? nextOrder(data.checklistTemplates),
      recurrence, startPeriod, endPeriod: endPeriod && comparePeriods(endPeriod, startPeriod) >= 0 ? endPeriod : undefined,
    });
    onClose();
  };
  const remove = async () => {
    if (!value) return;
    if (!await confirmDialog(`「${value.label}」を削除します。よろしいですか？`)) return;
    await db.checklistTemplates.delete(value.id);
    onClose();
  };

  return (
    <Dialog open onClose={onClose}>
      <Title text={value ? 'やることを編集' : 'やることを追加'} onDelete={value && remove}
        deleteHint="この先の給料日のチェックリストから消す" />
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField id="check-label" label="やること" value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="例: 楽天へ支払い分を送金" autoFocus={canAutoFocus} fullWidth />
          <TextField id="check-recurrence" select label="頻度" value={recType} onChange={(e) => setRecType(e.target.value as typeof recType)} fullWidth>
            <MenuItem value="monthly">毎月</MenuItem>
            <MenuItem value="interval">数か月に1回</MenuItem>
            <MenuItem value="yearly">毎年</MenuItem>
          </TextField>
          {recType === 'interval' && (
            <TextField id="check-interval" select label="何か月に1回か" value={months} onChange={(e) => setMonths(Number(e.target.value))} fullWidth
              helperText="開始月から数えます">
              {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => <MenuItem key={n} value={n}>{n}か月に1回</MenuItem>)}
            </TextField>
          )}
          {recType === 'yearly' && (
            <TextField id="check-month" select label="何月か" value={month} onChange={(e) => setMonth(Number(e.target.value))} fullWidth>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <MenuItem key={m} value={m}>{m}月</MenuItem>)}
            </TextField>
          )}
          <TextField id="check-start" select label="開始月" value={startPeriod} fullWidth
            onChange={(e) => { setStartPeriod(e.target.value); if (endPeriod && comparePeriods(endPeriod, e.target.value) < 0) setEndPeriod(''); }}>
            {withValue(startPeriod).map((p) => <MenuItem key={p} value={p}>{periodYearLabel(p, startDay)}</MenuItem>)}
          </TextField>
          <TextField id="check-end" select label="終了月" value={endPeriod} onChange={(e) => setEndPeriod(e.target.value)} fullWidth
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
            <MenuItem value="">なし（ずっと続ける）</MenuItem>
            {withValue(endPeriod).filter((p) => comparePeriods(p, startPeriod) >= 0)
              .map((p) => <MenuItem key={p} value={p}>{periodYearLabel(p, startDay)}</MenuItem>)}
          </TextField>
        </Stack>
      </DialogContent>
      <Actions valid={valid} onSave={save} onClose={onClose} />
    </Dialog>
  );
}

/** 定期項目が入る月と金額の一覧（保存前の入力内容で出す） */
function ScheduleDialog({ name, rows, startDay, onClose }: {
  name: string; rows: ScheduleRow[]; startDay: StartDay; onClose: () => void;
}) {
  return (
    <Dialog open onClose={onClose}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 1.5 }}>
        <Box component="span" sx={{ flex: 1, minWidth: 0 }}>{name}の月ごとの金額</Box>
        <IconButton aria-label="閉じる" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 3 }}>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
          1年前から表示します。終了月がない項目は2年先まで。保存前の入力内容で計算しています
        </Typography>
        {rows.length === 0 && <Typography variant="body2" color="text.secondary">この期間に入る月はありません</Typography>}
        <Stack divider={<Divider flexItem />}>
          {rows.map((r) => (
            <Stack key={r.period} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.75 }}>
              <Typography variant="body2">{periodYearLabel(r.period, startDay)}</Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" fontWeight={700}>{yen(r.amount)}</Typography>
                {r.overridden && <Typography variant="caption" color="primary" display="block">この月だけ変更</Typography>}
              </Box>
            </Stack>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

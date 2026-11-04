import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_SETTINGS, type AppData } from '../domain/types';
import { db } from './db';

/** 全データを読み込む（個人用でデータ量は小さいため丸ごと読む） */
export function useAppData(): AppData | undefined {
  return useLiveQuery(async () => {
    const [settings, accounts, categories, items, entries, categoryActuals, cardBills, receivables, checklistTemplates, checklistDone] =
      await Promise.all([
        db.settings.get('app'),
        db.accounts.toArray(),
        db.categories.toArray(),
        db.items.toArray(),
        db.entries.toArray(),
        db.categoryActuals.toArray(),
        db.cardBills.toArray(),
        db.receivables.toArray(),
        db.checklistTemplates.toArray(),
        db.checklistDone.toArray(),
      ]);
    return {
      settings: settings ?? DEFAULT_SETTINGS,
      accounts, categories, items, entries, categoryActuals, cardBills, receivables, checklistTemplates, checklistDone,
    };
  }, []);
}

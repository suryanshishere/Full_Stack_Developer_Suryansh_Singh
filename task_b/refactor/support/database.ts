export type Row = Record<string, string | number | null>;
export type Tables = Record<string, Row[]>;

function literal(token: string): string | number {
  const text = token.trim();
  if (text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1);
  const asNumber = Number(text);
  return Number.isNaN(asNumber) ? text : asNumber;
}

function operand(token: string, row: Row): string | number | null {
  const text = token.trim();
  if (text.startsWith("'")) return text.slice(1, -1);
  if (text in row) return row[text];
  return literal(text);
}

function matches(row: Row, where: string): boolean {
  return where.split(/\s+OR\s+/i).some((clause) =>
    clause
      .split(/\s+AND\s+/i)
      .every((term) => {
        const [left, right] = term.split("=");
        if (right === undefined) return false;
        return String(operand(left, row)) === String(operand(right, row));
      })
  );
}

function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of text) {
    if (char === "'") quoted = !quoted;
    if (char === "," && !quoted) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim());
}

export class Database {
  private tables: Tables;
  private savepoint: Tables | null = null;

  constructor(seed: Tables) {
    this.tables = structuredClone(seed);
  }

  snapshot(): Tables {
    return structuredClone(this.tables);
  }

  async query(sql: string): Promise<Row[]> {
    const statement = sql.trim().replace(/\s+/g, " ");

    const select = /^SELECT \* FROM (\w+) WHERE (.+)$/i.exec(statement);
    if (select) {
      const [, table, where] = select;
      return (this.tables[table] ?? [])
        .filter((row) => matches(row, where))
        .map((row) => ({ ...row }));
    }

    const update = /^UPDATE (\w+) SET (.+) WHERE (.+)$/i.exec(statement);
    if (update) {
      const [, table, assignments, where] = update;
      const targets = (this.tables[table] ?? []).filter((row) => matches(row, where));
      for (const row of targets) {
        for (const assignment of splitTopLevel(assignments)) {
          const index = assignment.indexOf("=");
          row[assignment.slice(0, index).trim()] = literal(assignment.slice(index + 1));
        }
      }
      return targets.map((row) => ({ ...row }));
    }

    const insert = /^INSERT INTO (\w+) \((.+?)\) VALUES \((.+)\)$/i.exec(statement);
    if (insert) {
      const [, table, columns, values] = insert;
      const names = splitTopLevel(columns);
      const parsed = splitTopLevel(values).map(literal);
      const row: Row = {};
      names.forEach((name, index) => {
        row[name] = parsed[index] ?? null;
      });
      this.tables[table] ??= [];
      this.tables[table].push(row);
      return [row];
    }

    throw new Error(`Unsupported statement: ${statement}`);
  }

  async transaction<T>(work: (tx: Database) => Promise<T>): Promise<T> {
    if (this.savepoint) throw new Error("Nested transactions are not supported");
    const savepoint = this.snapshot();
    this.savepoint = savepoint;
    try {
      const result = await work(this);
      this.savepoint = null;
      return result;
    } catch (error) {
      this.tables = savepoint;
      this.savepoint = null;
      throw error;
    }
  }

  async findSubscription(id: string): Promise<Row | null> {
    const row = (this.tables.subscriptions ?? []).find((entry) => entry.id === id);
    return row ? { ...row } : null;
  }

  async applySubscriptionChange(
    id: string,
    change: { plan: string; priceCents: number; changedAt: string }
  ): Promise<Row> {
    const row = (this.tables.subscriptions ?? []).find((entry) => entry.id === id);
    if (!row) throw new Error(`Subscription ${id} disappeared mid-transaction`);
    row.plan = change.plan;
    row.price_cents = change.priceCents;
    row.updated_at = change.changedAt;
    return { ...row };
  }

  async recordEvent(event: {
    subscriptionId: string;
    type: string;
    detail: string;
    actorId: string;
    createdAt: string;
  }): Promise<void> {
    this.tables.subscription_events ??= [];
    this.tables.subscription_events.push({
      subscription_id: event.subscriptionId,
      type: event.type,
      detail: event.detail,
      actor_id: event.actorId,
      created_at: event.createdAt,
    });
  }

  table(name: string): Row[] {
    return this.tables[name] ?? [];
  }
}

export const seedTables: Tables = {
  subscriptions: [
    {
      id: "sub_ana",
      user_id: "user_ana",
      email: "ana@example.com",
      plan: "starter",
      price_cents: 2400,
      discount_percent: 0,
      payment_ref: "pay_ana_9931",
      internal_notes: "Called support twice about a late box",
      updated_at: "2026-06-01T09:00:00.000Z",
    },
    {
      id: "sub_ben",
      user_id: "user_ben",
      email: "ben@example.com",
      plan: "classic",
      price_cents: 3600,
      discount_percent: 25,
      payment_ref: "pay_ben_4417",
      internal_notes: "Churn risk, flagged by retention",
      updated_at: "2026-06-02T09:00:00.000Z",
    },
  ],
  subscription_events: [],
};

export let database = new Database(seedTables);

export function resetDatabase(): Database {
  database = new Database(seedTables);
  return database;
}

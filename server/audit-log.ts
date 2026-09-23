export interface AuditEvent {
  readonly at: string;
  readonly action: 'share.read' | 'invoice.issue' | 'session.read';
  readonly tenant: string;
  readonly actor: 'guest' | 'owner';
  readonly decision: 'allow' | 'deny';
  readonly reason: string;
}

export interface AuditLog {
  append(event: Omit<AuditEvent, 'at'> & { readonly at?: string }): AuditEvent;
  entries(): readonly AuditEvent[];
}

/** Append-only log for this process. A durable archive is a later sink behind the same interface. */
export function createAuditLog(now: () => string = () => new Date().toISOString()): AuditLog {
  const events: AuditEvent[] = [];
  return {
    append(event) {
      const stored: AuditEvent = {
        at: event.at ?? now(),
        action: event.action,
        tenant: event.tenant,
        actor: event.actor,
        decision: event.decision,
        reason: event.reason,
      };
      events.push(stored);
      return stored;
    },
    entries() {
      return events.slice();
    },
  };
}

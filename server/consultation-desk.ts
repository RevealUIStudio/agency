export interface DeskConsultationUpdate {
  readonly bookingId: string;
  readonly email: string;
  readonly meetLink: string;
  readonly eventId: string;
  readonly fromStatus: 'consultation_paid';
  readonly toStatus: 'consultation_scheduled';
}

/**
 * Desk Sheet writer is not in this repo. The webhook records the status
 * transition for a later sink and does not call Google Sheets.
 */
export async function recordDeskConsultationScheduled(
  update: DeskConsultationUpdate,
): Promise<{ written: false }> {
  console.info(
    JSON.stringify({
      type: 'desk.consultation',
      bookingId: update.bookingId,
      eventId: update.eventId,
      fromStatus: update.fromStatus,
      toStatus: update.toStatus,
      written: false,
      todo: 'sheet-writer-absent',
    }),
  );
  return { written: false };
}

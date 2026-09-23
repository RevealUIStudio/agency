import { Link } from '@revealui/router';
import {
  CANCEL_BODY,
  CANCEL_HEADING,
  CONSULTATION_BOOK_CANCEL_META,
} from '@/lib/consultation-book';

export { CONSULTATION_BOOK_CANCEL_META };

export function ConsultationBookCancelPage() {
  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Consultation</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {CANCEL_HEADING}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">{CANCEL_BODY}</p>
        <p className="mt-8 text-sm text-muted-foreground">
          <Link to="/consultation/book" className="font-semibold text-foreground hover:underline">
            Pick another time
          </Link>
        </p>
      </div>
    </section>
  );
}

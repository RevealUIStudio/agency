import { Link } from '@revealui/router';
import {
  CONSULTATION_BOOK_SUCCESS_META,
  SUCCESS_BODY,
  SUCCESS_HEADING,
} from '@/lib/consultation-book';

export { CONSULTATION_BOOK_SUCCESS_META };

export function ConsultationBookSuccessPage() {
  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Consultation</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {SUCCESS_HEADING}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">{SUCCESS_BODY}</p>
        <p className="mt-8 text-sm text-muted-foreground">
          <Link to="/consultation/book" className="font-semibold text-foreground hover:underline">
            Back to booking
          </Link>
        </p>
      </div>
    </section>
  );
}

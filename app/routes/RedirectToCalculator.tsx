import { Navigate } from '@revealui/router';

/** Client-side hop for leftover /pricing /products /catalog bookmarks. */
export function RedirectToCalculator() {
  return <Navigate to="/#calculator" replace />;
}

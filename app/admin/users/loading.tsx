import { PageLoadingSkeleton } from "@/components/PageLoadingSkeleton";

// The user table fetches up to 500 profiles + their auth emails, so show a
// list skeleton instead of a blank screen while it loads.
export default function Loading() {
    return <PageLoadingSkeleton variant="list" />;
}

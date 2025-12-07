import JobView from "../_components/JobView";

interface PageProps {
  params: Promise<{ shortId: string }>;
}

export default async function ModalJobPage({ params }: PageProps) {
  const { shortId } = await params;

  return <JobView shortId={shortId} modal />;
}
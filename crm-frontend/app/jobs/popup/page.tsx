import JobView from "./_components/JobView";

export default function ModalJobPage({
  params,
}: {
  params: { shortId: string };
}) {
  return <JobView shortId={params.shortId} modal />;
}

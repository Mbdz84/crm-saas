import JobView from "../_components/JobView";

export default async function ModalJobPage({ params }: any) {
  const { shortId } = params;

  return <JobView shortId={shortId} modal />;
}
import Feed from "../components/Feed";
import SiteHeader from "../components/SiteHeader";

export default function FeedPage() {
  return (
    <main className="min-h-screen bg-[#ffffff] px-5 pb-12 text-[#17131f] sm:px-8">
      <SiteHeader />
      <Feed />
    </main>
  );
}

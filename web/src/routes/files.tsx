import { Header } from "@/components/layout/header";
import { FileBrowser } from "@/components/files/file-browser";

export default function Files() {
  return (
    <>
      <Header title="Files" subtitle="Mirror of your local Semester 4 folder" />
      <div className="px-4 md:px-8 py-4 md:py-6 max-w-[1000px] mx-auto w-full">
        <FileBrowser />
      </div>
    </>
  );
}

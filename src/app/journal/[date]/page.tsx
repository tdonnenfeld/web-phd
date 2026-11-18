import { Journal } from "@/components/journal";
export default async function JournalDatePage({params}:{params:Promise<{date:string}>}){const {date}=await params;return <Journal initialDate={date}/>;}

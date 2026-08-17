import SiteNav from "@/components/SiteNav";
import CompanyDirectory from "@/components/CompanyDirectory";
import { getCompanies, getNavSession } from "@/lib/data";

export const metadata = { title: "Company Directory — SEPi Portal" };

export default async function CompaniesPage() {
  const [companies, nav] = await Promise.all([
    getCompanies(),
    getNavSession(),
  ]);

  const logoBase = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos`
    : null;

  return (
    <div className="min-h-screen bg-cream">
      <SiteNav session={nav} />

      <section className="px-6 pb-12 pt-10 text-center">
        <h1 className="display-serif text-5xl sm:text-6xl">Company Directory</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-midnight">
          Every venture built inside Sigma Eta Pi. Search by name, filter by
          pledge class, industry, or the year it was founded.
        </p>
        {nav.userId && (
          <p className="mt-6">
            <a
              href="/companies/new"
              className="btn inline-flex items-center rounded-full bg-navy px-6 py-2.5 text-sm font-bold text-white hover:bg-oxford"
            >
              Submit your company
            </a>
          </p>
        )}
      </section>

      <CompanyDirectory companies={companies} logoBase={logoBase} />
    </div>
  );
}

import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import CharacterSprite from '@/components/marketing/CharacterSprite';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CharacterSprite />
      <MarketingNav />
      <main className="pt-[72px] flex-1 min-h-screen">{children}</main>
      <MarketingFooter />
    </>
  );
}

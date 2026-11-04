import IconShield from '~icons/material-symbols/shield-person-rounded'

export function Home() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex items-center gap-3">
        <IconShield width={24} height={24} className="text-primary" aria-hidden />
        <h1 className="text-headline-small">ShopNexus Console</h1>
      </div>
    </main>
  )
}

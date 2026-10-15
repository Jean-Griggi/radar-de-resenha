import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="k-empty">
      <h1 className="k-empty__title">Essa rua não existe.</h1>
      <div className="k-empty__action">
        <Link href="/" className="button button--primary">
          Voltar para o início
        </Link>
      </div>
    </div>
  );
}

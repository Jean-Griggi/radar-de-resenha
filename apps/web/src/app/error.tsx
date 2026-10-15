'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="k-empty">
      <h1 className="k-empty__title">Algo deu errado.</h1>
      <div className="k-empty__action">
        <button type="button" className="button button--primary" onClick={() => reset()}>
          Tentar de novo
        </button>
      </div>
    </div>
  );
}

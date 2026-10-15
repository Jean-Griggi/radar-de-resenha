import { Star } from 'lucide-react';

/** Nota de resenha em estrelas (ícone lucide, não caractere). O nome acessível diz a nota; as estrelas são decoração. */
export function Stars({ rating }: { rating: number }) {
  return (
    <span className="k-stars" role="img" aria-label={`Nota ${rating} de 5`}>
      {Array.from({ length: rating }, (_, index) => (
        <Star key={index} size={16} fill="currentColor" aria-hidden />
      ))}
    </span>
  );
}

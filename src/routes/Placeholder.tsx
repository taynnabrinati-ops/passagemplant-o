import { Card, CardContent } from "@/components/ui/card";

/**
 * Stand-in for the sections outside this build's scope (Round, Passagem de
 * plantão, Arquivo, Admin). The nav keeps its shape without pretending the
 * screens exist.
 */
export function Placeholder({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Esta seção ainda não foi implementada nesta cópia. O quadro de leitos é a tela
          reproduzida.
        </CardContent>
      </Card>
    </div>
  );
}

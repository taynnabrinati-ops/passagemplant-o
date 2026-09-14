import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bug, FlaskConical, Stethoscope, Syringe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HospitalBed } from "@/components/icons/HospitalBed";
import { ageFromBirthDate, daysSince, formatDate, isOncePerDay, therapyDayLabel } from "@/lib/days";
import { cfmPriority } from "@/lib/clinical";
import { useBedsWithPatients, usePatientDetail, useUnits } from "@/data/queries";

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Stethoscope;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function BedDetail() {
  const { bedNumber } = useParams<{ bedNumber: string }>();
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("unit") ?? undefined;

  const units = useUnits();
  const unit = units.data?.find((entry) => entry.slug === slug) ?? units.data?.[0];
  const beds = useBedsWithPatients(unit);

  const bed = beds.data?.find((entry) => String(entry.bed_number) === bedNumber);
  const patient = bed?.patients?.find((entry) => entry.is_active) ?? null;
  const detail = usePatientDetail(patient?.id);

  const backTo = `/dashboard${slug ? `?unit=${slug}` : ""}`;
  const stayLabel = unit?.kind === "ward" ? "internação" : "CTI";

  if (beds.isLoading || units.isLoading) {
    return <Skeleton className="h-64 rounded-lg" />;
  }

  if (!bed) {
    return (
      <div className="space-y-4">
        <Link to={backTo} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Voltar aos leitos
        </Link>
        <p className="text-sm text-muted-foreground">Leito não encontrado nesta unidade.</p>
      </div>
    );
  }

  const priority = patient ? cfmPriority(patient.cfm_priority) : null;
  const age = patient ? (patient.age_years ?? ageFromBirthDate(patient.birth_date)) : null;

  return (
    <div className="space-y-6">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos leitos
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <HospitalBed className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Leito {String(bed.bed_number).padStart(2, "0")}
              {bed.label ? ` · ${bed.label}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">{bed.units?.name}</p>
          </div>
        </div>
      </div>

      {!patient ? (
        <p className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
          Leito vago — nenhum paciente admitido.
        </p>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-6">
              <div>
                <p className="text-lg font-semibold text-foreground">{patient.name}</p>
                <p className="text-sm text-muted-foreground">
                  {age === null ? "" : `${age} anos · `}
                  D{daysSince(patient.admission_date)} de {stayLabel} · admissão em{" "}
                  {formatDate(patient.admission_date)}
                  {patient.insurance ? ` · ${patient.insurance}` : ""}
                </p>
              </div>

              {(patient.syndromic_dx || patient.specific_dx) && (
                <div className="space-y-0.5">
                  {patient.syndromic_dx && (
                    <p className="text-sm font-bold text-foreground">{patient.syndromic_dx}</p>
                  )}
                  {patient.specific_dx && (
                    <p className="text-sm text-foreground">{patient.specific_dx}</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {patient.terminality && <Badge variant="destructive">Terminalidade</Badge>}
                {patient.palliative_care && !patient.terminality && (
                  <Badge className="border-amber-500/60 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-100">
                    Paliativos
                  </Badge>
                )}
                {priority && (
                  <Badge variant="outline" title={priority.description}>
                    CFM {priority.short}
                  </Badge>
                )}
                {patient.has_allergy && <Badge variant="destructive">Alergia</Badge>}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Condutas do round" icon={Stethoscope}>
              {detail.data?.conducts.length ? (
                detail.data.conducts.map((conduct) => (
                  <div key={conduct.id} className="flex items-start gap-2 text-sm">
                    <span
                      className={
                        conduct.done
                          ? "mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                          : "mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500"
                      }
                    />
                    <span className={conduct.done ? "text-muted-foreground line-through" : ""}>
                      {conduct.text}
                    </span>
                  </div>
                ))
              ) : (
                <Empty>Nenhuma conduta registrada.</Empty>
              )}
            </Section>

            <Section title="Invasões" icon={Syringe}>
              {detail.data?.invasions.length ? (
                detail.data.invasions.map((invasion) => (
                  <div key={invasion.id} className="flex items-baseline justify-between gap-2 text-sm">
                    <span>
                      {invasion.kind}
                      {invasion.site ? (
                        <span className="text-muted-foreground"> · {invasion.site}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      D{daysSince(invasion.start_date)}
                    </span>
                  </div>
                ))
              ) : (
                <Empty>Nenhuma invasão ativa.</Empty>
              )}
            </Section>

            <Section title="Medicações em curso" icon={FlaskConical}>
              {detail.data?.medications.length ? (
                detail.data.medications.map((medication) => (
                  <div key={medication.id} className="flex items-baseline justify-between gap-2 text-sm">
                    <span>
                      <span className="font-medium">{medication.drug}</span>
                      {medication.detail ? (
                        <span className="text-muted-foreground"> · {medication.detail}</span>
                      ) : null}
                      <span className="block text-xs text-muted-foreground">{medication.kind}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {therapyDayLabel(
                        medication.kind,
                        medication.start_date,
                        undefined,
                        isOncePerDay(medication.note),
                      )}
                    </span>
                  </div>
                ))
              ) : (
                <Empty>Nenhuma medicação em curso.</Empty>
              )}
            </Section>

            <Section title="Culturas" icon={Bug}>
              {detail.data?.cultures.length ? (
                detail.data.cultures.map((culture) => (
                  <div key={culture.id} className="flex items-baseline justify-between gap-2 text-sm">
                    <span>
                      {culture.material}
                      {culture.site ? (
                        <span className="text-muted-foreground"> · {culture.site}</span>
                      ) : null}
                      {culture.organism ? (
                        <span className="block text-xs font-medium text-destructive">
                          {culture.organism}
                        </span>
                      ) : null}
                      <span className="block text-xs text-muted-foreground">
                        Coleta em {formatDate(culture.collection_date)}
                      </span>
                    </span>
                    <Badge
                      variant={
                        culture.status === "positive"
                          ? "destructive"
                          : culture.status === "pending"
                            ? "secondary"
                            : "outline"
                      }
                      className="shrink-0"
                    >
                      {culture.status === "positive"
                        ? "Positiva"
                        : culture.status === "pending"
                          ? "Em andamento"
                          : "Negativa"}
                    </Badge>
                  </div>
                ))
              ) : (
                <Empty>Nenhuma cultura registrada.</Empty>
              )}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

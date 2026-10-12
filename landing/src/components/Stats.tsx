import { Reveal } from "./Reveal";
import { stats } from "@/data/content";
import { useI18n } from "@/i18n/LanguageContext";

/**
 * 숫자 요약 — E안에서는 큰 숫자 위에 gold 1px 선을 얹고,
 * 근거를 mono 각주로 함께 적는다(숫자만 믿게 만들지 않기).
 */
export function Stats() {
  const { t } = useI18n();

  return (
    <section aria-label={t("숫자 요약")} className="pb-[clamp(48px,7vw,88px)]">
      <div className="shell grid gap-8 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        {stats.map((stat, i) => (
          <Reveal
            key={stat.label}
            delay={i + 1}
            className="flex flex-col gap-1.5 border-t border-brand pt-[22px]"
          >
            <span className="text-[56px] font-bold leading-none tracking-[-0.03em] text-paper">
              {stat.value}
              <span className="text-[20px] tracking-normal text-mute">{t(stat.suffix)}</span>
            </span>
            <span className="text-sm text-body">{t(stat.label)}</span>
            {stat.note && (
              <span className="font-mono text-[11px] leading-relaxed text-faint">
                {t(stat.note)}
              </span>
            )}
          </Reveal>
        ))}
      </div>
    </section>
  );
}

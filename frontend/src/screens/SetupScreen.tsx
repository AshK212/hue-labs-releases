import { useJourney } from "../journey/JourneyContext";
import { Column, Reveal } from "../components/Screen";
import { IconBadge, StatusCard } from "../components/Bits";
import { Button } from "../components/Button";
import { ModelDownload } from "../components/ModelDownload";
import { ArrowRightIcon, CheckIcon, CloudIcon } from "../components/Icons";

export function SetupScreen() {
  const { ollamaReady, modelInstalled, selectedModel, recommendation, refreshOllama, next } =
    useJourney();

  const isPrimary = selectedModel === recommendation?.primary.model;
  const modelLabel =
    (isPrimary
      ? recommendation?.primary.display_name
      : recommendation?.alternatives[0]?.display_name) ?? selectedModel ?? "the model";
  const sizeGb = isPrimary
    ? recommendation?.primary.download_size_gb
    : recommendation?.alternatives[0]?.download_size_gb;

  if (!ollamaReady) {
    return <SetupOllama onRecheck={refreshOllama} />;
  }

  if (!modelInstalled && selectedModel) {
    return (
      <Column>
        <ModelDownload
          model={selectedModel}
          label={modelLabel}
          sizeGb={sizeGb}
          onComplete={refreshOllama}
          onContinue={next}
        />
      </Column>
    );
  }

  // Already installed: two calm status cards.
  return (
    <Column>
      <Reveal index={0}>
        <h1 className="text-page font-semibold text-ink-900">Everything is set up</h1>
      </Reveal>
      <Reveal index={1} className="mt-2">
        <p className="text-body text-ink-500">We use Ollama to run the model on your computer.</p>
      </Reveal>
      <div className="mt-7 space-y-3">
        <Reveal index={2}>
          <StatusCard
            tone="green"
            icon={<CheckIcon className="w-5 h-5" />}
            title="Ollama is installed"
            subtitle="It is running quietly in the background."
          />
        </Reveal>
        <Reveal index={3}>
          <StatusCard
            tone="green"
            icon={<CheckIcon className="w-5 h-5" />}
            title={`${modelLabel} is installed`}
            subtitle="The model is ready to use."
          />
        </Reveal>
      </div>
      <Reveal index={4} className="mt-9">
        <Button onClick={next} rightIcon={<ArrowRightIcon className="w-[18px] h-[18px]" />}>
          Continue
        </Button>
      </Reveal>
    </Column>
  );
}

function SetupOllama({ onRecheck }: { onRecheck: () => void }) {
  const steps = [
    "Download Ollama from ollama.com. It is free.",
    "Open it once so it runs quietly in the background.",
    "Come back here and select Check again.",
  ];
  return (
    <Column>
      <Reveal index={0}>
        <IconBadge size="lg">
          <CloudIcon className="w-7 h-7" />
        </IconBadge>
      </Reveal>
      <Reveal index={1} className="mt-6">
        <h1 className="text-page font-semibold text-ink-900">Let's set up Ollama</h1>
      </Reveal>
      <Reveal index={2} className="mt-2">
        <p className="text-body leading-relaxed text-ink-500 max-w-[30rem]">
          Ollama is the free app that runs the model on your computer. It takes about a
          minute.
        </p>
      </Reveal>

      <Reveal index={3} className="mt-6">
        <div className="surface p-6">
          <ol className="space-y-4">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3.5">
                <span className="flex-shrink-0 grid place-items-center w-7 h-7 rounded-full bg-mist-100 text-ink-500 text-caption font-semibold">
                  {i + 1}
                </span>
                <p className="text-body text-ink-700 pt-0.5 leading-relaxed">{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>

      <Reveal index={4} className="mt-7 flex items-center gap-3">
        <Button onClick={onRecheck}>Check again</Button>
        <a className="inline-flex items-center h-12 px-6 rounded-btn text-body font-medium text-ink-500 hover:text-ink-900 hover:bg-mist-100 transition-colors" href="https://ollama.com/download" target="_blank" rel="noreferrer">
          Get Ollama
        </a>
      </Reveal>
    </Column>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GENRE_GROUPS } from "@/config";
import type { P2PQuestionnaireQuestion } from "@/config";

type Answer = string | string[] | null;

export function QuestionnaireForm({
  questions,
  initialAnswers,
}: {
  questions: P2PQuestionnaireQuestion[];
  initialAnswers: Record<string, Answer>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>(initialAnswers);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const question = questions[step];
  const isLast = step === questions.length - 1;

  const save = async (nextAnswers: Record<string, Answer>) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/p2p/questionnaire", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: nextAnswers }),
      });
      const json = await res.json();
      if (!json.success) setMessage(json.message ?? "Unable to save your answers.");
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    if (isLast) {
      await save(answers);
      setMessage("Saved. Thanks for completing the questionnaire.");
      router.refresh();
      return;
    }
    setStep((s) => s + 1);
  };

  const skip = async () => {
    const next = { ...answers, [question.id]: null };
    setAnswers(next);
    if (isLast) {
      await save(next);
      setMessage("Saved.");
      router.refresh();
      return;
    }
    setStep((s) => s + 1);
  };

  const setAnswer = (value: Answer) => setAnswers((prev) => ({ ...prev, [question.id]: value }));

  const toggleMultiOption = (option: string) => {
    const current = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : [];
    setAnswer(current.includes(option) ? current.filter((o) => o !== option) : [...current, option]);
  };

  const currentAnswer = answers[question.id];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Question {step + 1} of {questions.length}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-base font-medium text-stone-900">{question.prompt}</p>

        {question.type === "single_choice" && question.options && (
          <div className="flex flex-wrap gap-2">
            {question.options.map((option) => (
              <button key={option} type="button" onClick={() => setAnswer(option)}>
                <Badge variant={currentAnswer === option ? "default" : "outline"} className="px-3 py-1.5">
                  {option}
                </Badge>
              </button>
            ))}
          </div>
        )}

        {question.type === "multi_choice" && (
          <div className="flex flex-wrap gap-2">
            {GENRE_GROUPS.map((genre) => {
              const selected = Array.isArray(currentAnswer) && currentAnswer.includes(genre.slug);
              return (
                <button key={genre.slug} type="button" onClick={() => toggleMultiOption(genre.slug)}>
                  <Badge variant={selected ? "default" : "outline"} className="px-3 py-1.5">
                    {genre.name}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}

        {question.type === "text" && (
          <textarea
            className="min-h-24 w-full rounded-lg border border-stone-300 bg-sand-50 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-500"
            value={typeof currentAnswer === "string" ? currentAnswer : ""}
            onChange={(e) => setAnswer(e.target.value)}
          />
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button type="button" onClick={goNext} disabled={saving}>
            {isLast ? "Finish" : "Next"}
          </Button>
          <Button type="button" variant="outline" onClick={skip} disabled={saving}>
            Skip
          </Button>
          {step > 0 && (
            <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={saving}>
              Back
            </Button>
          )}
          {message && <span className="text-sm text-stone-500">{message}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

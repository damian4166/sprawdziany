"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { isAnswerCorrect } from "../lib/quiz-state.mjs";
import { isTeacherCredentialsValid } from "../lib/teacher-auth.mjs";

type Role = "teacher" | "student";

type Question = {
  id: string;
  text: string;
  type?: "text" | "abcd";
  answer: string;
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  createdAt: string;
};

type Answer = {
  id: string;
  studentId: string;
  questionId: string;
  value: string;
  createdAt: string;
};

export default function Home() {
  const [role, setRole] = useState<Role>("teacher");
  const [quizState, setQuizState] = useState<{ questions: Question[]; answers: Answer[] }>({
    questions: [],
    answers: [],
  });
  const [studentId, setStudentId] = useState("");
  const [lastStudentId, setLastStudentId] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"text" | "abcd">("text");
  const [questionAnswer, setQuestionAnswer] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOption, setCorrectOption] = useState<"A" | "B" | "C" | "D">("A");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [studentQuestionIndex, setStudentQuestionIndex] = useState(0);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [teacherLogin, setTeacherLogin] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [isStudentLoggedIn, setIsStudentLoggedIn] = useState(false);
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);
  const [teacherError, setTeacherError] = useState("");
  const [status, setStatus] = useState("Łączenie z serwerem WebSocket...");
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsPath = process.env.NEXT_PUBLIC_WS_URL || "/api/ws";
    const defaultWebSocketUrl =
      typeof window !== "undefined"
        ? new URL(wsPath, window.location.href)
        : new URL(`ws://localhost:3000${wsPath}`);

    if (typeof window !== "undefined") {
      defaultWebSocketUrl.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    }

    const socket = new WebSocket(defaultWebSocketUrl.toString());
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setStatus("Połączono. Odbieram aktualny stan quizu.");
      socket.send(JSON.stringify({ type: "get-state" }));
    });

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "state") {
          setQuizState(message.payload);
          if (!selectedQuestionId && message.payload.questions?.[0]) {
            setSelectedQuestionId(message.payload.questions[0].id);
          }
        }
      } catch {
        setStatus("Otrzymano nieprawidłową wiadomość z serwera.");
      }
    });

    socket.addEventListener("close", () => {
      setStatus("Połączenie z serwerem zostało zamknięte.");
    });

    socket.addEventListener("error", () => {
      setStatus("Nie udało się połączyć z serwerem WebSocket.");
    });

    return () => socket.close();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedId = sessionStorage.getItem("quiz-student-id");
      if (savedId) {
        setStudentId(savedId);
        setIsStudentLoggedIn(true);
      }
    }
  }, []);

  useEffect(() => {
    if (quizState.questions.length > 0 && !selectedQuestionId) {
      setSelectedQuestionId(quizState.questions[0].id);
    }
  }, [quizState.questions, selectedQuestionId]);

  useEffect(() => {
    if (role !== "student") {
      return;
    }

    setStudentQuestionIndex(0);
    setIsTestFinished(false);
  }, [role]);

  useEffect(() => {
    if (role !== "student" || isTestFinished || !quizState.questions[studentQuestionIndex]) {
      return undefined;
    }

    setTimeLeft(60);
    const timerId = window.setInterval(() => {
      setTimeLeft((previousTimeLeft) => {
        if (previousTimeLeft <= 1) {
          window.clearInterval(timerId);
          setStatus(`Czas minął na pytanie: ${quizState.questions[studentQuestionIndex].text}`);
          setStudentAnswer("");

          if (studentQuestionIndex >= quizState.questions.length - 1) {
            setIsTestFinished(true);
            setTimeLeft(0);
          } else {
            setStudentQuestionIndex((previousIndex) => previousIndex + 1);
          }

          return 0;
        }

        return previousTimeLeft - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [role, quizState.questions, studentQuestionIndex, isTestFinished]);

  const handleAddQuestion = (event: FormEvent) => {
    event.preventDefault();

    if (!questionText.trim()) {
      setStatus("Uzupełnij treść pytania.");
      return;
    }

    if (questionType === "abcd") {
      if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
        setStatus("Uzupełnij wszystkie opcje A, B, C i D.");
        return;
      }

      socketRef.current?.send(
        JSON.stringify({
          type: "add-question",
          payload: {
            text: questionText.trim(),
            type: "abcd",
            options: {
              A: optionA.trim(),
              B: optionB.trim(),
              C: optionC.trim(),
              D: optionD.trim(),
            },
            answer: correctOption,
          },
        })
      );
    } else {
      if (!questionAnswer.trim()) {
        setStatus("Uzupełnij poprawną odpowiedź.");
        return;
      }

      socketRef.current?.send(
        JSON.stringify({
          type: "add-question",
          payload: {
            text: questionText.trim(),
            type: "text",
            answer: questionAnswer.trim(),
          },
        })
      );
    }

    setQuestionText("");
    setQuestionAnswer("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectOption("A");
    setStatus("Pytanie zostało dodane i wysłane do uczniów.");
  };

  const handleSubmitAnswer = (event: FormEvent) => {
    event.preventDefault();

    if (!isStudentLoggedIn || !studentId.trim()) {
      setStatus("Zaloguj się jako uczeń przed wysłaniem odpowiedzi.");
      return;
    }

    if (!currentStudentQuestion || !studentAnswer.trim()) {
      setStatus("Wybierz odpowiedź i wyślij ją.");
      return;
    }

    const normalizedId = studentId.trim();
    socketRef.current?.send(
      JSON.stringify({
        type: "submit-answer",
        payload: {
          studentId: normalizedId,
          questionId: currentStudentQuestion.id,
          value: studentAnswer.trim(),
        },
      })
    );

    setLastStudentId(normalizedId);
    setStudentAnswer("");
    setStatus(`Odpowiedź zapisana dla ${normalizedId}.`);

    if (studentQuestionIndex >= quizState.questions.length - 1) {
      setIsTestFinished(true);
      setTimeLeft(0);
      setIsStudentLoggedIn(false);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("quiz-student-id");
      }
      return;
    }

    setStudentQuestionIndex((previousIndex) => previousIndex + 1);
    setTimeLeft(60);
  };

  const handleTeacherLogin = (event: FormEvent) => {
    event.preventDefault();

    if (!teacherLogin.trim() || !teacherPassword.trim()) {
      setTeacherError("Podaj login i hasło.");
      setIsTeacherAuthenticated(false);
      return;
    }

    if (isTeacherCredentialsValid(teacherLogin, teacherPassword)) {
      setIsTeacherAuthenticated(true);
      setTeacherError("");
      setRole("teacher");
      setStatus("Zalogowano jako nauczyciel.");
      return;
    }

    setIsTeacherAuthenticated(false);
    setTeacherError("Nieprawidłowy login lub hasło.");
  };

  const handleTeacherLogout = () => {
    setIsTeacherAuthenticated(false);
    setTeacherLogin("");
    setTeacherPassword("");
    setTeacherError("");
    setStatus("Wylogowano z panelu nauczyciela.");
  };

  const handleStudentLogin = (event: FormEvent) => {
    event.preventDefault();

    if (!studentId.trim()) {
      setStatus("Podaj swój identyfikator ucznia.");
      return;
    }

    const normalizedId = studentId.trim();
    setStudentId(normalizedId);
    setLastStudentId(normalizedId);
    setIsStudentLoggedIn(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("quiz-student-id", normalizedId);
    }
    setStatus(`Zalogowano jako ${normalizedId}.`);
  };

  const currentStudentQuestion = quizState.questions[studentQuestionIndex];
  const activeStudentId = studentId.trim() || lastStudentId.trim();
  const studentAnswers = activeStudentId
    ? quizState.answers.filter((answer) => answer.studentId === activeStudentId)
    : [];
  const totalQuestions = quizState.questions.length;
  const correctAnswerCount = studentAnswers.filter((answer) => {
    const question = quizState.questions.find((item) => item.id === answer.questionId);
    return question ? isAnswerCorrect(question, answer.value) : false;
  }).length;
  const studentScorePercent = totalQuestions > 0 ? Math.round((correctAnswerCount / totalQuestions) * 100) : 0;

  const formatTimeLeft = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Sprawdziany online</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Quiz live z odpowiedziami uczniów</h1>
          <p className="mt-3 max-w-2xl text-base text-slate-300">
            Nauczyciel dodaje pytania, a uczniowie odpowiadają wpisując swój identyfikator. Każda odpowiedź
            pojawia się natychmiast po stronie nauczyciela dzięki WebSocket.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
              {quizState.questions.length} pytań
            </span>
            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1">
              {quizState.answers.length} odpowiedzi
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1">{status}</span>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/20 sm:p-6">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setRole("teacher")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                role === "teacher"
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              Widok nauczyciela
            </button>
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                role === "student"
                  ? "bg-sky-500 text-slate-950"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              Widok ucznia
            </button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {role === "teacher" ? (
              <div className="space-y-6">
                {!isTeacherAuthenticated ? (
                  <form onSubmit={handleTeacherLogin} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <h2 className="text-xl font-semibold">Logowanie nauczyciela</h2>
                    <p className="mt-2 text-sm text-slate-400">Dane logowania: login test, hasło test.</p>
                    <div className="mt-4 space-y-3">
                      <input
                        value={teacherLogin}
                        onChange={(event) => setTeacherLogin(event.target.value)}
                        placeholder="Login"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0"
                      />
                      <input
                        value={teacherPassword}
                        onChange={(event) => setTeacherPassword(event.target.value)}
                        placeholder="Hasło"
                        type="password"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0"
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950"
                      >
                        Zaloguj się
                      </button>
                    </div>
                    {teacherError ? <p className="mt-3 text-sm text-rose-400">{teacherError}</p> : null}
                  </form>
                ) : (
                  <>
                    <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                      <h2 className="text-xl font-semibold">Panel nauczyciela</h2>
                      <button
                        type="button"
                        onClick={handleTeacherLogout}
                        className="rounded-full border border-slate-700 px-3 py-2 text-sm text-slate-300"
                      >
                        Wyloguj
                      </button>
                    </div>

                    <form onSubmit={handleAddQuestion} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                      <h2 className="text-xl font-semibold">Dodaj nowe pytanie</h2>
                      <div className="mt-4 space-y-3">
                        <input
                          value={questionText}
                          onChange={(event) => setQuestionText(event.target.value)}
                          placeholder="Treść pytania"
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0"
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block text-sm text-slate-300">
                            Typ pytania
                            <select
                              value={questionType}
                              onChange={(event) => setQuestionType(event.target.value as "text" | "abcd")}
                              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none"
                            >
                              <option value="text">Tekstowe</option>
                              <option value="abcd">ABCD</option>
                            </select>
                          </label>
                        </div>
                        {questionType === "abcd" ? (
                          <div className="space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <input
                                value={optionA}
                                onChange={(event) => setOptionA(event.target.value)}
                                placeholder="Opcja A"
                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0"
                              />
                              <input
                                value={optionB}
                                onChange={(event) => setOptionB(event.target.value)}
                                placeholder="Opcja B"
                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0"
                              />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <input
                                value={optionC}
                                onChange={(event) => setOptionC(event.target.value)}
                                placeholder="Opcja C"
                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0"
                              />
                              <input
                                value={optionD}
                                onChange={(event) => setOptionD(event.target.value)}
                                placeholder="Opcja D"
                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0"
                              />
                            </div>
                            <label className="block text-sm text-slate-300">
                              Poprawna opcja
                              <select
                                value={correctOption}
                                onChange={(event) => setCorrectOption(event.target.value as "A" | "B" | "C" | "D")}
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none"
                              >
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                              </select>
                            </label>
                          </div>
                        ) : (
                          <input
                            value={questionAnswer}
                            onChange={(event) => setQuestionAnswer(event.target.value)}
                            placeholder="Poprawna odpowiedź"
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0"
                          />
                        )}
                        <button
                          type="submit"
                          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950"
                        >
                          Dodaj pytanie
                        </button>
                      </div>
                    </form>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                      <h2 className="text-xl font-semibold">Aktywne pytania</h2>
                      <div className="mt-4 space-y-3">
                        {quizState.questions.length === 0 ? (
                          <p className="text-sm text-slate-400">Brak pytań. Dodaj pierwsze pytanie.</p>
                        ) : (
                          quizState.questions.map((question: Question) => (
                            <div key={question.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                              <p className="font-medium text-slate-100">{question.text}</p>
                              {question.type === "abcd" && question.options ? (
                                <div className="mt-3 space-y-2">
                                  {(['A', 'B', 'C', 'D'] as const).map((optionKey) => (
                                    <p key={optionKey} className="text-sm text-slate-300">
                                      <span className="font-semibold text-slate-100">{optionKey}:</span> {question.options?.[optionKey]}
                                    </p>
                                  ))}
                                  <p className="mt-2 text-sm text-emerald-300">
                                    Poprawna opcja: {question.answer} &#8211; {question.options[question.answer as keyof typeof question.options]}
                                  </p>
                                </div>
                              ) : (
                                <p className="mt-1 text-sm text-emerald-300">Odpowiedź: {question.answer}</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Odpowiedz na pytanie</h2>
                  <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-sm text-sky-300">
                    {formatTimeLeft(timeLeft)}
                  </span>
                </div>

                {quizState.questions.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400">Brak pytań. Poczekaj, aż nauczyciel doda pierwsze pytanie.</p>
                ) : isTestFinished ? (
                  <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
                    <h3 className="text-lg font-semibold">Test zakończony</h3>
                    <p className="mt-2 text-sm">Dziękujemy za udział. Twoje odpowiedzi zostały zapisane.</p>
                    <p className="mt-2 text-sm">
                      Twój wynik: {correctAnswerCount} / {totalQuestions} ({studentScorePercent}%)
                    </p>
                  </div>
                ) : currentStudentQuestion ? (
                  <form onSubmit={handleSubmitAnswer} className="mt-4 space-y-3">
                    <p className="text-sm text-slate-400">
                      Pytanie {studentQuestionIndex + 1} z {quizState.questions.length}
                    </p>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <p className="font-medium text-slate-100">{currentStudentQuestion.text}</p>
                    </div>
                    {!isStudentLoggedIn ? (
                      <div className="space-y-3">
                        <input
                          value={studentId}
                          onChange={(event) => setStudentId(event.target.value)}
                          placeholder="Twój identyfikator"
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0"
                        />
                        <button
                          type="button"
                          onClick={handleStudentLogin}
                          className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950"
                        >
                          Zaloguj jako uczeń
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-400">Zalogowany jako: {studentId}</p>
                        {currentStudentQuestion.type === "abcd" && currentStudentQuestion.options ? (
                          <div className="space-y-2">
                            {(["A", "B", "C", "D"] as const).map((optionKey) => (
                              <label key={optionKey} className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                                <input
                                  type="radio"
                                  name="answer"
                                  value={optionKey}
                                  checked={studentAnswer === optionKey}
                                  onChange={(event) => setStudentAnswer(event.target.value)}
                                  className="h-4 w-4 text-sky-500"
                                />
                                <span className="text-sm text-slate-100">
                                  {optionKey}: {currentStudentQuestion.options?.[optionKey]}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <textarea
                            value={studentAnswer}
                            onChange={(event) => setStudentAnswer(event.target.value)}
                            placeholder="Twoja odpowiedź"
                            className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0"
                          />
                        )}
                      </div>
                    )}
                    <button
                      type="submit"
                      className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950"
                    >
                      Wyślij odpowiedź
                    </button>
                  </form>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">Wszystkie pytania zostały już pokazane.</p>
                )}
              </div>
            )}

            {role === "teacher" && isTeacherAuthenticated ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <h2 className="text-xl font-semibold">Odpowiedzi uczniów na żywo</h2>
                <div className="mt-4 space-y-3">
                  {quizState.answers.length === 0 ? (
                    <p className="text-sm text-slate-400">Na razie nie ma jeszcze odpowiedzi.</p>
                  ) : (
                    quizState.answers.map((answer: Answer) => {
                      const question = quizState.questions.find((item: Question) => item.id === answer.questionId);
                      return (
                        <div key={answer.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-slate-100">{answer.studentId}</p>
                            <p className="text-xs text-slate-500">{new Date(answer.createdAt).toLocaleTimeString("pl-PL")}</p>
                          </div>
                          <p className="mt-2 text-sm text-slate-300">{question?.text ?? "Pytanie usunięte"}</p>
                          <p className="mt-1 text-sm text-sky-300">{answer.value}</p>
                          {question ? (
                            <p
                              className={`mt-2 text-sm font-medium ${
                                isAnswerCorrect(question, answer.value) ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {isAnswerCorrect(question, answer.value) ? "Poprawna odpowiedź" : "Niepoprawna odpowiedź"}
                            </p>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

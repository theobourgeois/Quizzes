import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import {
    ChevronDown,
    RefreshCw,
    Shuffle,
    ClipboardList,
    Settings,
    Check,
    X,
} from "lucide-react";
import _4174_mod1 from "./quizzes/4174-mod1.json";
import _4174_mod2_part1 from "./quizzes/4174-mod2-part1.json";
import _4174_mod2_part2 from "./quizzes/4174-mod2-part2.json";
import _4174_mod3_part1 from "./quizzes/4174-mod3-part1.json";
import _4174_mod3_part2 from "./quizzes/4174-mod3-part2.json";
import _4174_midterm from "./quizzes/4174-midterm.json";
import _4174_midterm2 from "./quizzes/4174-midterm2.json";
import _4174_tools from "./quizzes/4174-tools.json";
import _3137_quiz2 from "./quizzes/3137-quiz2.json";

const quizzes = {
    "4174-midterm": _4174_midterm,
    "4174-midterm2": _4174_midterm2,
    "4174-mod1": _4174_mod1,
    "4174-mod2-part1": _4174_mod2_part1,
    "4174-mod2-part2": _4174_mod2_part2,
    "4174-mod3-part1": _4174_mod3_part1,
    "4174-mod3-part2": _4174_mod3_part2,
    "4174-tools": _4174_tools,
    "3137-quiz2": _3137_quiz2,
};

type QuizKey = keyof typeof quizzes;
type QuizQuestion = {
    question: string;
    answers: string[];
    // Either a single answer index or an array of indices for multiple answers
    correctAnswer: number | number[];
};
type QuizSettings = {
    quizKeys: QuizKey[];
    questionCount: number;
};

function App() {
    const [quizSettings, setQuizSettings] = useState<QuizSettings>({
        quizKeys: Object.keys(quizzes) as QuizKey[],
        questionCount: 5,
    });

    // Each element is either a number (for single select) or number[] (for multi–select)
    const [quizAnswers, setQuizAnswers] = useState<
        QuizQuestion["correctAnswer"][]
    >([]);
    const [results, setResults] = useState<number[]>([]);
    const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [quizCompleted, setQuizCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showAnswers, setShowAnswers] = useState(false);

    const handleBuildQuiz = (quizSettings: QuizSettings, shuffle = true) => {
        setIsLoading(true);

        setTimeout(() => {
            try {
                const questions = quizSettings.quizKeys
                    .map((key) => quizzes[key])
                    .flat();

                if (shuffle) {
                    questions.sort(() => Math.random() - 0.5);
                }

                const quiz = questions.slice(0, quizSettings.questionCount);
                setQuiz(quiz);
                handleReset();
                setCurrentQuestion(0);
                setQuizCompleted(false);
            } finally {
                setIsLoading(false);
            }
        }, 10);
    };

    useEffect(() => {
        const storedQuizSettings = localStorage.getItem("quizSettings");
        if (storedQuizSettings) {
            setQuizSettings(JSON.parse(storedQuizSettings));
        } else {
            handleBuildQuiz(quizSettings);
        }

        const storedQuiz = localStorage.getItem("quiz");
        if (storedQuiz) {
            setQuiz(JSON.parse(storedQuiz));
        }

        const storedQuizAnswers = localStorage.getItem("quizAnswers");
        if (storedQuizAnswers) {
            setQuizAnswers(JSON.parse(storedQuizAnswers));
        }

        const storedCurrentQuestion = localStorage.getItem("currentQuestion");
        if (storedCurrentQuestion) {
            setCurrentQuestion(JSON.parse(storedCurrentQuestion));
        }

        document.body.classList.add("bg-gray-50");

        return () => {
            document.body.classList.remove("bg-gray-50");
        };
    }, []);

    useSkipFirstRenderEffect(() => {
        localStorage.setItem("quiz", JSON.stringify(quiz));
    }, [quiz]);

    useSkipFirstRenderEffect(() => {
        localStorage.setItem(
            "currentQuestion",
            JSON.stringify(currentQuestion)
        );
    }, [currentQuestion]);

    useSkipFirstRenderEffect(() => {
        localStorage.setItem("quizAnswers", JSON.stringify(quizAnswers));
    }, [quizAnswers]);

    useSkipFirstRenderEffect(() => {
        localStorage.setItem("quizSettings", JSON.stringify(quizSettings));
    }, [quizSettings]);

    const handleChangeQuizSettings =
        (key: keyof QuizSettings) =>
        (
            event:
                | React.ChangeEvent<HTMLInputElement>
                | React.ChangeEvent<HTMLSelectElement>
        ) => {
            const newSettings = { ...quizSettings };
            if (key === "quizKeys") {
                newSettings[key] = Array.from(
                    (event.target as HTMLSelectElement).selectedOptions
                ).map((option) => option.value as QuizKey);
                handleBuildQuiz(newSettings);
            } else {
                newSettings[key] = Number(event.target.value);
                handleBuildQuiz(newSettings, false);
            }

            setQuizSettings(newSettings);
        };

    // For single-select questions
    const handleSingleAnswer =
        (questionIndex: number, answerIndex: number) => () => {
            const newAnswers = [...quizAnswers];
            newAnswers[questionIndex] = answerIndex;
            setQuizAnswers(newAnswers);
        };

    // For multi-select questions – toggles an answer selection
    const handleMultiAnswer =
        (questionIndex: number, answerIndex: number) => () => {
            const newAnswers = [...quizAnswers];
            const current = Array.isArray(newAnswers[questionIndex])
                ? (newAnswers[questionIndex] as number[])
                : [];
            if (current.includes(answerIndex)) {
                newAnswers[questionIndex] = current.filter(
                    (a) => a !== answerIndex
                );
            } else {
                newAnswers[questionIndex] = [...current, answerIndex];
            }
            setQuizAnswers(newAnswers);
        };

    // Helper to compare arrays (order-independent)
    const arraysEqual = (a: number[], b: number[]) => {
        if (a.length !== b.length) return false;
        const sortedA = [...a].sort((x, y) => x - y);
        const sortedB = [...b].sort((x, y) => x - y);
        return sortedA.every((val, idx) => val === sortedB[idx]);
    };

    const handleSubmit = () => {
        const newResults = [];
        for (let i = 0; i < quiz.length; i++) {
            const correct = quiz[i].correctAnswer;
            const userAnswer = quizAnswers[i];
            if (Array.isArray(correct)) {
                if (
                    Array.isArray(userAnswer) &&
                    arraysEqual(userAnswer, correct)
                ) {
                    newResults.push(1);
                } else {
                    newResults.push(0);
                }
            } else {
                if (userAnswer === correct) {
                    newResults.push(1);
                } else {
                    newResults.push(0);
                }
            }
        }
        setResults(newResults);
        setQuizCompleted(true);
        setShowAnswers(false);
    };

    const allQuestionsAnswered =
        quizAnswers.length >= quiz.length &&
        quizAnswers.filter((answer) => answer !== undefined).length ===
            quiz.length;

    const handleReset = () => {
        setQuizAnswers([]);
        setResults([]);
        setQuizCompleted(false);
        setShowAnswers(false);
    };

    const getTotalQuestions = (quizKeys: QuizKey[]) => {
        return quizKeys.reduce((acc, key) => acc + quizzes[key].length, 0);
    };

    const handleShowAllQuestions = () => {
        setIsLoading(true);

        setTimeout(() => {
            try {
                const totalQuestions = getTotalQuestions(quizSettings.quizKeys);
                const newQuizSettings = {
                    ...quizSettings,
                    questionCount: totalQuestions,
                };
                setQuizSettings(newQuizSettings);
                handleBuildQuiz(newQuizSettings, false);
            } finally {
                setIsLoading(false);
            }
        }, 10);
    };

    const navigateToQuestion = (index: number) => {
        if (index >= 0 && index < quiz.length) {
            setCurrentQuestion(index);
        }
    };

    const score = results.reduce((acc, curr) => acc + curr, 0);
    const percentage =
        quiz.length > 0 ? Math.round((score / quiz.length) * 100) : 0;

    return (
        <div className="min-h-screen py-8 px-4 flex flex-col items-center justify-center bg-gray-50">
            <GlassCard className="w-full max-w-4xl mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-4xl font-bold text-gray-800">
                        Ultimate Quiz App 2.0 v6.3.1 beta 2 (2021) 🚀
                    </h1>
                    <button
                        onClick={() => setSettingsOpen(!settingsOpen)}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        <Settings className="w-5 h-5" />
                        <ChevronDown
                            className={`w-5 h-5 transition-transform ${
                                settingsOpen ? "rotate-180" : ""
                            }`}
                        />
                    </button>
                </div>

                {settingsOpen && (
                    <div className="mb-6 p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-gray-200">
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <div className="text-xl font-medium text-gray-700">
                                    Total Available Questions:{" "}
                                    {getTotalQuestions(quizSettings.quizKeys)}
                                </div>
                                <div className="space-x-2 flex">
                                    <GlassButton
                                        onClick={() =>
                                            handleBuildQuiz(quizSettings)
                                        }
                                        icon={<Shuffle className="w-4 h-4" />}
                                        disabled={isLoading}
                                    >
                                        Shuffle Quiz
                                    </GlassButton>
                                    <GlassButton
                                        onClick={handleShowAllQuestions}
                                        icon={
                                            <ClipboardList className="w-4 h-4" />
                                        }
                                        disabled={isLoading}
                                    >
                                        Show All
                                    </GlassButton>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 mb-2">
                                        Quizzes (Hold Shift to Select Multiple):
                                    </label>
                                    <GlassSelect
                                        value={quizSettings.quizKeys}
                                        onChange={handleChangeQuizSettings(
                                            "quizKeys"
                                        )}
                                        multiple
                                    >
                                        {Object.keys(quizzes).map((key) => (
                                            <option
                                                className="text-black"
                                                key={key}
                                                value={key}
                                            >
                                                {key}
                                            </option>
                                        ))}
                                    </GlassSelect>
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-2">
                                        Number of Questions:
                                    </label>
                                    <GlassInput
                                        max={getTotalQuestions(
                                            quizSettings.quizKeys
                                        )}
                                        type="number"
                                        value={quizSettings.questionCount}
                                        onChange={handleChangeQuizSettings(
                                            "questionCount"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {quizCompleted ? (
                    <div className="flex flex-col items-center py-10 w-full">
                        <h2 className="text-4xl font-bold mb-6 text-gray-800">
                            Quiz Results
                        </h2>

                        <div className="relative w-64 h-64 mb-8">
                            <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
                            <div
                                className="absolute inset-0 rounded-full border-8 border-transparent border-t-blue-400 border-r-blue-300"
                                style={{
                                    transform: `rotate(${percentage * 3.6}deg)`,
                                    transition:
                                        "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-5xl font-bold text-gray-800">
                                    {percentage}%
                                </span>
                                <span className="text-lg text-gray-600">
                                    {score} / {quiz.length}
                                </span>
                            </div>
                        </div>

                        <div className="w-full space-y-6">
                            <GlassButton
                                onClick={() => setShowAnswers(!showAnswers)}
                                className="w-full"
                            >
                                {showAnswers ? "Hide Answers" : "Show Answers"}
                            </GlassButton>

                            {showAnswers &&
                                quiz.map((q, i) => (
                                    <div
                                        key={i}
                                        className="p-6 mb-4 rounded-lg bg-white/60 border border-gray-200"
                                    >
                                        <h3 className="text-lg font-semibold mb-4 text-gray-700">
                                            {q.question}
                                            <span
                                                className={`ml-2 ${
                                                    results[i]
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                (
                                                {results[i]
                                                    ? "Correct"
                                                    : "Incorrect"}
                                                )
                                            </span>
                                        </h3>
                                        <div className="space-y-2">
                                            {q.answers.map((answer, pos) => {
                                                let isCorrect, isUserAnswer;
                                                if (
                                                    Array.isArray(
                                                        q.correctAnswer
                                                    )
                                                ) {
                                                    isCorrect = (
                                                        q.correctAnswer as number[]
                                                    ).includes(pos);
                                                    isUserAnswer =
                                                        Array.isArray(
                                                            quizAnswers[i]
                                                        )
                                                            ? (
                                                                  quizAnswers[
                                                                      i
                                                                  ] as number[]
                                                              ).includes(pos)
                                                            : false;
                                                } else {
                                                    isCorrect =
                                                        pos === q.correctAnswer;
                                                    isUserAnswer =
                                                        pos === quizAnswers[i];
                                                }
                                                return (
                                                    <div
                                                        key={pos}
                                                        className={twMerge(
                                                            "p-3 rounded-md flex items-center justify-between",
                                                            isCorrect
                                                                ? "bg-green-100 border border-green-300"
                                                                : isUserAnswer
                                                                ? "bg-red-100 border border-red-300"
                                                                : "bg-gray-100 border border-gray-200"
                                                        )}
                                                    >
                                                        <span className="text-gray-700">
                                                            {answer}
                                                        </span>
                                                        <div className="flex gap-2">
                                                            {isCorrect && (
                                                                <Check className="w-4 h-4 text-green-600" />
                                                            )}
                                                            {isUserAnswer &&
                                                                !isCorrect && (
                                                                    <X className="w-4 h-4 text-red-600" />
                                                                )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                        </div>

                        <GlassButton
                            onClick={handleReset}
                            icon={<RefreshCw className="w-4 h-4" />}
                            className="px-8 mt-6"
                        >
                            Try Again
                        </GlassButton>
                    </div>
                ) : (
                    <>
                        {quiz.length > 0 && (
                            <>
                                <div className="w-full mb-6 gap-4 flex justify-between items-center">
                                    <div className="text-gray-600">
                                        Question {currentQuestion + 1} of{" "}
                                        {quiz.length}
                                    </div>
                                    <div className="flex gap-1 flex-wrap flex-1">
                                        {quiz.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() =>
                                                    navigateToQuestion(idx)
                                                }
                                                className={twMerge(
                                                    "w-3 h-3 rounded-full transition-all",
                                                    idx === currentQuestion
                                                        ? "bg-gray-800 scale-125"
                                                        : quizAnswers[idx] !==
                                                          undefined
                                                        ? "bg-gray-400"
                                                        : "bg-gray-300"
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="w-full p-6 mb-6 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200">
                                    <h2 className="text-2xl font-bold mb-6 text-gray-800">
                                        {quiz[currentQuestion].question}
                                    </h2>
                                    {Array.isArray(
                                        quiz[currentQuestion].correctAnswer
                                    ) ? (
                                        <div className="grid grid-cols-1 gap-3">
                                            {quiz[currentQuestion].answers.map(
                                                (answer, position) => (
                                                    <GlassCheckbox
                                                        key={position}
                                                        label={answer}
                                                        checked={
                                                            Array.isArray(
                                                                quizAnswers[
                                                                    currentQuestion
                                                                ]
                                                            )
                                                                ? (
                                                                      quizAnswers[
                                                                          currentQuestion
                                                                      ] as number[]
                                                                  ).includes(
                                                                      position
                                                                  )
                                                                : false
                                                        }
                                                        onChange={handleMultiAnswer(
                                                            currentQuestion,
                                                            position
                                                        )}
                                                    />
                                                )
                                            )}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3">
                                            {quiz[currentQuestion].answers.map(
                                                (answer, position) => (
                                                    <button
                                                        key={position}
                                                        className={twMerge(
                                                            "text-left p-4 rounded-lg transition-all",
                                                            "border border-gray-200 backdrop-blur-sm",
                                                            quizAnswers[
                                                                currentQuestion
                                                            ] === position
                                                                ? "bg-blue-100/70 border-blue-300 text-gray-800"
                                                                : "bg-white/70 hover:bg-blue-50/70 text-gray-700"
                                                        )}
                                                        onClick={handleSingleAnswer(
                                                            currentQuestion,
                                                            position
                                                        )}
                                                    >
                                                        <div className="flex items-center">
                                                            <div
                                                                className={twMerge(
                                                                    "w-6 h-6 rounded-full mr-3 flex items-center justify-center border",
                                                                    quizAnswers[
                                                                        currentQuestion
                                                                    ] ===
                                                                        position
                                                                        ? "border-gray-800 bg-white/70"
                                                                        : "border-gray-300"
                                                                )}
                                                            >
                                                                {quizAnswers[
                                                                    currentQuestion
                                                                ] ===
                                                                    position && (
                                                                    <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
                                                                )}
                                                            </div>
                                                            {answer}
                                                        </div>
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between w-full">
                                    <GlassButton
                                        onClick={() =>
                                            navigateToQuestion(
                                                currentQuestion - 1
                                            )
                                        }
                                        disabled={currentQuestion === 0}
                                        className={
                                            currentQuestion === 0
                                                ? "opacity-50 cursor-not-allowed"
                                                : ""
                                        }
                                    >
                                        Previous
                                    </GlassButton>

                                    {currentQuestion === quiz.length - 1 ? (
                                        <GlassButton
                                            onClick={handleSubmit}
                                            disabled={!allQuestionsAnswered}
                                            className={
                                                !allQuestionsAnswered
                                                    ? "opacity-50 cursor-not-allowed"
                                                    : "bg-blue-100/70 border-blue-300"
                                            }
                                        >
                                            Submit Quiz
                                        </GlassButton>
                                    ) : (
                                        <GlassButton
                                            onClick={() =>
                                                navigateToQuestion(
                                                    currentQuestion + 1
                                                )
                                            }
                                        >
                                            Next
                                        </GlassButton>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}
            </GlassCard>
        </div>
    );
}

const GlassCard = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <div
            className={twMerge(
                "bg-white/30 backdrop-blur-md border border-gray-200 rounded-2xl p-6 shadow-lg",
                "relative overflow-hidden",
                className
            )}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/20 pointer-events-none"></div>
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-100/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10">{children}</div>
        </div>
    );
};

const GlassButton = ({
    children,
    onClick,
    disabled,
    className,
    icon,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    icon?: React.ReactNode;
}) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={twMerge(
                "px-4 py-2 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg",
                "transition-all hover:bg-white/70 text-gray-700 hover:text-gray-900",
                "flex items-center gap-2 font-medium",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            {icon && icon}
            {children}
        </button>
    );
};

const GlassInput = ({
    value,
    onChange,
    max,
    type = "text",
}: {
    value: string | number;
    max?: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
}) => {
    return (
        <input
            type={type}
            value={value}
            max={max}
            onChange={onChange}
            className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-black/10 rounded-lg text-black outline-none focus:border-gray-400/50 transition-colors"
        />
    );
};

const GlassSelect = ({
    children,
    value,
    onChange,
    multiple,
}: {
    children: React.ReactNode;
    value: string | string[];
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    multiple?: boolean;
}) => {
    return (
        <select
            value={value}
            onChange={onChange}
            multiple={multiple}
            className="w-full px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white outline-none focus:border-gray-400/50 transition-colors"
        >
            {children}
        </select>
    );
};

// New custom checkbox component for multi-select questions
const GlassCheckbox = ({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: () => void;
}) => {
    return (
        <label className="flex items-center p-4 rounded-lg border border-gray-200 bg-white/70 hover:bg-blue-50/70 text-gray-700 cursor-pointer">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="mr-2"
            />
            {label}
        </label>
    );
};

function useSkipFirstRenderEffect(callback: () => void, deps: unknown[]) {
    const firstRender = useRef(true);
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        return callback();
    }, [callback, deps]);
}

export default App;

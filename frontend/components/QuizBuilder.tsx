import React, { useState } from 'react';
import { Trash2, Plus, Copy } from 'lucide-react';

interface QuizOption {
  text: string;
  is_correct: boolean;
}

interface QuizQuestion {
  text: string;
  question_type: 'MULTIPLE_CHOICE' | 'PARAGRAPH' | 'SHORT_ANSWER';
  points: number;
  options?: QuizOption[];
}

interface QuizBuilderProps {
  onQuestionsChange: (questions: QuizQuestion[]) => void;
  initialQuestions?: QuizQuestion[];
}

const QuizBuilder: React.FC<QuizBuilderProps> = ({ onQuestionsChange, initialQuestions = [] }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      text: '',
      question_type: 'MULTIPLE_CHOICE',
      points: 1,
      options: [
        { text: '', is_correct: false },
        { text: '', is_correct: false },
      ],
    };
    const updatedQuestions = [...questions, newQuestion];
    setQuestions(updatedQuestions);
    setSelectedQuestionIndex(updatedQuestions.length - 1);
    onQuestionsChange(updatedQuestions);
  };

  const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
    onQuestionsChange(updatedQuestions);
  };

  const deleteQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    if (selectedQuestionIndex === index) {
      setSelectedQuestionIndex(updatedQuestions.length > 0 ? 0 : null);
    }
    onQuestionsChange(updatedQuestions);
  };

  const duplicateQuestion = (index: number) => {
    const questionToDuplicate = questions[index];
    const newQuestion = JSON.parse(JSON.stringify(questionToDuplicate));
    const updatedQuestions = [...questions.slice(0, index + 1), newQuestion, ...questions.slice(index + 1)];
    setQuestions(updatedQuestions);
    onQuestionsChange(updatedQuestions);
  };

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...questions];
    if (!updatedQuestions[questionIndex].options) {
      updatedQuestions[questionIndex].options = [];
    }
    updatedQuestions[questionIndex].options!.push({ text: '', is_correct: false });
    setQuestions(updatedQuestions);
    onQuestionsChange(updatedQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, field: keyof QuizOption, value: any) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[questionIndex].options) {
      const opt = updatedQuestions[questionIndex].options![optionIndex];
      updatedQuestions[questionIndex].options![optionIndex] = { ...opt, [field]: value } as QuizOption;
    }
    setQuestions(updatedQuestions);
    onQuestionsChange(updatedQuestions);
  };

  const deleteOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[questionIndex].options) {
      updatedQuestions[questionIndex].options = updatedQuestions[questionIndex].options!.filter(
        (_, i) => i !== optionIndex
      );
    }
    setQuestions(updatedQuestions);
    onQuestionsChange(updatedQuestions);
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg border border-slate-200">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Quiz Builder</h3>
        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
        >
          <Plus size={16} /> Add Question
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <p className="text-slate-600 mb-4">No questions added yet</p>
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} /> Create First Question
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, qIndex) => (
            <div key={qIndex} className="border border-slate-200 rounded-lg p-6 bg-slate-50">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Question {qIndex + 1}</label>
                  <textarea
                    value={question.text}
                    onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                    placeholder="Enter your question..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    type="button"
                    onClick={() => duplicateQuestion(qIndex)}
                    className="p-2 text-slate-600 hover:bg-white rounded border border-slate-300"
                    title="Duplicate"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteQuestion(qIndex)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded border border-red-300"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Type</label>
                  <select
                    value={question.question_type}
                    onChange={(e) => {
                      const newType = e.target.value as QuizQuestion['question_type'];
                      updateQuestion(qIndex, 'question_type', newType);
                      if (newType !== 'MULTIPLE_CHOICE' && !question.options) {
                        updateQuestion(qIndex, 'options', []);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="PARAGRAPH">Paragraph</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Points</label>
                  <input
                    type="number"
                    value={question.points}
                    onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {question.question_type === 'MULTIPLE_CHOICE' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-slate-700">Options</label>
                    <button
                      type="button"
                      onClick={() => addOption(qIndex)}
                      className="text-xs bg-white text-primary border border-primary px-2 py-1 rounded hover:bg-primary hover:text-white"
                    >
                      + Add Option
                    </button>
                  </div>

                  {question.options?.map((option, oIndex) => (
                    <div key={oIndex} className="flex gap-2 items-center bg-white p-3 rounded border border-slate-200">
                      <input
                        type="checkbox"
                        checked={option.is_correct}
                        onChange={(e) => updateOption(qIndex, oIndex, 'is_correct', e.target.checked)}
                        className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
                        title="Mark as correct answer"
                      />
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOption(qIndex, oIndex, 'text', e.target.value)}
                        placeholder="Option text..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {question.options && question.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => deleteOption(qIndex, oIndex)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {questions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{questions.length}</strong> question{questions.length !== 1 ? 's' : ''} - Total Points:{' '}
            <strong>{questions.reduce((sum, q) => sum + (q.points || 0), 0)}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default QuizBuilder;

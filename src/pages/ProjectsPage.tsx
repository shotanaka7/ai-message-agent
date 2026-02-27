import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as projectRepo from "../services/db/project-repository";
import * as messageRepo from "../services/db/message-repository";
import { Classifier } from "../services/classification/classifier";
import { useAppStore } from "../store/app-store";
import { useClassificationStore } from "../store/classification-store";
import type { Project } from "../types";

interface ProjectWithCount extends Project {
  messageCount: number;
}

const PROJECT_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316",
];

export function ProjectsPage() {
  const navigate = useNavigate();
  const apiKey = useAppStore((s) => s.apiKeys.anthropicApiKey);
  const { currentJob, isClassifying, setProgress, setClassifying, clearJob } =
    useClassificationStore();

  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
  const [unclassifiedCount, setUnclassifiedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState(PROJECT_COLORS[0]);
  const [formKeywords, setFormKeywords] = useState("");
  const [formPrompt, setFormPrompt] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [allProjects, unclassified] = await Promise.all([
        projectRepo.getAllProjects(),
        messageRepo.getUnclassifiedCount(),
      ]);

      const withCounts: ProjectWithCount[] = await Promise.all(
        allProjects.map(async (p) => ({
          ...p,
          messageCount: await messageRepo.getMessageCountByProject(p.id),
        }))
      );

      setProjects(withCounts);
      setUnclassifiedCount(unclassified);
    } catch {
      // DB not initialized
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormColor(PROJECT_COLORS[0]);
    setFormKeywords("");
    setFormPrompt("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;

    const keywordsArray = formKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (editingId) {
      await projectRepo.updateProject(editingId, {
        name: formName.trim(),
        description: formDescription.trim() || null,
        color: formColor,
        keywords: JSON.stringify(keywordsArray),
        classification_prompt: formPrompt.trim() || null,
      });
    } else {
      await projectRepo.createProject({
        id: crypto.randomUUID(),
        name: formName.trim(),
        description: formDescription.trim() || null,
        color: formColor,
        icon: null,
        keywords: JSON.stringify(keywordsArray),
        classification_prompt: formPrompt.trim() || null,
        is_archived: 0,
      });
    }

    resetForm();
    await loadData();
  };

  const handleEdit = (project: ProjectWithCount) => {
    setEditingId(project.id);
    setFormName(project.name);
    setFormDescription(project.description || "");
    setFormColor(project.color || PROJECT_COLORS[0]);
    try {
      const kw = project.keywords ? JSON.parse(project.keywords) : [];
      setFormKeywords(kw.join(", "));
    } catch {
      setFormKeywords("");
    }
    setFormPrompt(project.classification_prompt || "");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await projectRepo.deleteProject(id);
    await loadData();
  };

  const handleClassify = async () => {
    if (!apiKey) return;

    const classifier = new Classifier(apiKey);
    classifier.onProgress = (progress) => setProgress(progress);

    setClassifying(true);
    try {
      await classifier.classifyAll();
    } catch (error) {
      console.error("Classification failed:", error);
    } finally {
      setClassifying(false);
      await loadData();
      setTimeout(() => clearJob(), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const progressPercent = currentJob
    ? Math.round(
        (currentJob.processedMessages / Math.max(currentJob.totalMessages, 1)) *
          100
      )
    : 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Projects
          <span className="text-base font-normal text-gray-500 ml-2">
            ({projects.length})
          </span>
        </h2>
        <div className="flex items-center gap-3">
          {unclassifiedCount > 0 && (
            <button
              onClick={handleClassify}
              disabled={isClassifying || !apiKey}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isClassifying
                ? `Classifying... (${progressPercent}%)`
                : `Classify ${unclassifiedCount} messages`}
            </button>
          )}
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 transition-colors"
          >
            + New Project
          </button>
        </div>
      </div>

      {/* Classification Progress */}
      {currentJob && isClassifying && (
        <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-indigo-700 font-medium">
              Classifying messages...
            </span>
            <span className="text-indigo-600">
              {currentJob.processedMessages}/{currentJob.totalMessages} (Batch{" "}
              {currentJob.currentBatch}/{currentJob.totalBatches})
            </span>
          </div>
          <div className="w-full bg-indigo-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Completed/Failed notification */}
      {currentJob && !isClassifying && (
        <div
          className={`mb-6 border rounded-lg p-4 ${
            currentJob.status === "completed"
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              currentJob.status === "completed"
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {currentJob.status === "completed"
              ? `Classification complete! ${currentJob.processedMessages} messages classified.`
              : `Classification failed: ${currentJob.errorMessage}`}
          </p>
        </div>
      )}

      {/* New/Edit Form */}
      {showForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingId ? "Edit Project" : "New Project"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Project name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Keywords (comma separated)
              </label>
              <input
                type="text"
                value={formKeywords}
                onChange={(e) => setFormKeywords(e.target.value)}
                placeholder="keyword1, keyword2..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Description
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Classification Rules
              </label>
              <textarea
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                placeholder="例: デザインレビューやUI実装に関するメッセージをこのプロジェクトに分類。見積もりの話題は除外。"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">
                自然言語で分類ルールを記述。AIがこのルールを最優先で参照します。
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Color
              </label>
              <div className="flex gap-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFormColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      formColor === c
                        ? "border-gray-800 scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={!formName.trim()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {editingId ? "Update" : "Create"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Project Cards */}
      {projects.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-500">
            No projects yet. Create a project and classify your messages.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            let keywords: string[] = [];
            try {
              keywords = project.keywords
                ? JSON.parse(project.keywords)
                : [];
            } catch {
              /* noop */
            }

            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{
                        backgroundColor: project.color || "#6B7280",
                      }}
                    />
                    <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                      {project.name}
                    </h3>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {project.messageCount} msgs
                  </span>
                </div>

                {project.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}

                {project.classification_prompt && (
                  <p className="text-xs text-indigo-500 mb-2 line-clamp-2">
                    {project.classification_prompt}
                  </p>
                )}

                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {keywords.slice(0, 5).map((kw) => (
                      <span
                        key={kw}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                      >
                        {kw}
                      </span>
                    ))}
                    {keywords.length > 5 && (
                      <span className="text-xs text-gray-400">
                        +{keywords.length - 5}
                      </span>
                    )}
                  </div>
                )}

                <div
                  className="flex gap-2 mt-3 pt-3 border-t border-gray-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleEdit(project)}
                    className="text-xs text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

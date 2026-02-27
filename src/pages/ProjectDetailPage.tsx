import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as projectRepo from "../services/db/project-repository";
import * as messageRepo from "../services/db/message-repository";
import type { Project, Message } from "../types";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [proj, msgs, projects] = await Promise.all([
        projectRepo.getProjectById(id),
        messageRepo.getMessagesByProject(id, 200),
        projectRepo.getAllProjects(),
      ]);
      setProject(proj);
      setMessages(msgs);
      setAllProjects(projects);
    } catch {
      // DB not initialized
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReassign = async (messageId: string, newProjectId: string) => {
    if (newProjectId === "") {
      // Unassign
      await messageRepo.updateClassification(messageId, "", "manual", null);
    } else {
      await messageRepo.updateClassification(
        messageId,
        newProjectId,
        "manual",
        1.0
      );
    }
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Project not found.</p>
        <button
          onClick={() => navigate("/projects")}
          className="mt-4 text-sm text-indigo-600 hover:text-indigo-800"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  let keywords: string[] = [];
  try {
    keywords = project.keywords ? JSON.parse(project.keywords) : [];
  } catch {
    /* noop */
  }

  return (
    <div className="p-8">
      {/* Back */}
      <button
        onClick={() => navigate("/projects")}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
      >
        &larr; Back to Projects
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-5 h-5 rounded-full"
            style={{ backgroundColor: project.color || "#6B7280" }}
          />
          <h2 className="text-2xl font-bold text-gray-800">{project.name}</h2>
          <span className="text-sm text-gray-500">
            ({messages.length} messages)
          </span>
        </div>

        {project.description && (
          <p className="text-sm text-gray-600 mb-3">{project.description}</p>
        )}

        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
              >
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-500">
            No messages classified to this project yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {msg.sender_name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.sent_at).toLocaleString("ja-JP")}
                  </span>
                  {msg.classification && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        msg.classification === "auto"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {msg.classification}
                    </span>
                  )}
                  {msg.confidence != null && (
                    <span className="text-xs text-gray-400">
                      {Math.round(msg.confidence * 100)}%
                    </span>
                  )}
                </div>

                {/* Reassign dropdown */}
                <select
                  value={msg.project_id || ""}
                  onChange={(e) => handleReassign(msg.id, e.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
                >
                  <option value="">Unassign</option>
                  {allProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">
                {msg.body_plain}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

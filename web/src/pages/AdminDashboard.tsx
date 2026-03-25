import { useEffect, useMemo, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import ModelPerformanceMetrics from "../components/admin/ModelPerformanceMetrics";
import Retraining from "../components/admin/ReTrainingPanel";
import DataCollection from "@/components/admin/DataCollect";
import TrainingPanel from "../components/admin/TrainingPanel";
import Labels from "@/components/admin/Labels";
import ManualTesting from "@/components/admin/ManualTesting";
import {
  getModels,
  type TrainedModel,
  activateModel,
  deleteModel,
} from "../services/models";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import apiClient from "@/cfg/api";
import { useNavigate } from "react-router-dom";


export function AdminDashboard() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [models, setModels] = useState<TrainedModel[]>([]);
  const [activeModelId, setActiveModelId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labels, setLabels] = useState<string[]>([]);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const triggerSmartRefetch = useCallback(() => {
    console.log("Trigger smart refetch sequence...");
    
    setRefreshKey((prev) => prev + 1);
    
    setTimeout(() => {
        console.log("Retry 1...");
        setRefreshKey((prev) => prev + 1);
    }, 1000);

    setTimeout(() => {
        console.log("Retry 2...");
        setRefreshKey((prev) => prev + 1);
    }, 3000);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getModels()
        .then((data) => {
            console.log("Fetched models:", data);

        setModels(data);
        if (data.length > 0 && activeModelId == null) {
          let activeModel = data.find((model) => model.is_active === true);
          if (activeModel === undefined) {
            setActiveModelId(null);
          } else {
            setActiveModelId(activeModel.id);
          }
        }
      })
      .catch((e) => {
        console.log(e);
        setError(e?.message || "Failed to load models");
      })
      .finally(() => setLoading(false));
  }, [activeModelId, refreshKey]); 

  useEffect(() => {
     apiClient
        .get("/api/users/is_staff")
        .then((resp) => {
            if(!resp.data.is_staff) navigate("/");
        })
        .catch(() => navigate("/"));
  }, [])

  useEffect(() => {
    apiClient.get("api/models/labels/?active=true")
      .then((resp) => {
        setLabels(resp.data.labels.map((l: any) => l.name));
      })
      .catch(() => setLabels([]));
  }, [activeModelId]);

  const tableRows = useMemo(() => {
    return models.map((m) => ({
      id: m.id,
      name: m.name,
      previous_model_id: m.previous_model,
    }));
  }, [models]);

  const handleModelClick = (modelId: number) => {
    if (modelId && modelId !== activeModelId) {
      setSelectedModelId(modelId);
      setShowConfirmation(true);
    }
  };

  const confirmModelSwitch = async () => {
    if (selectedModelId == null) return;
    try {
      await activateModel(selectedModelId);
      setActiveModelId(selectedModelId);
      setShowConfirmation(false);
      setSelectedModelId(null);
    } catch (e: any) {
      setError(e?.message || "Failed to activate model");
    }
  };

  const cancelModelSwitch = () => {
    setShowConfirmation(false);
    setSelectedModelId(null);
  };

  const handleDeleteModel = async (e: React.MouseEvent, modelId: number) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      "Are you sure you want to delete this model?"
    );
    if (!confirmed) return;
    try {
      await deleteModel(modelId);
      setModels((prev) => prev.filter((m) => m.id !== modelId));
      if (activeModelId === modelId) {
        setActiveModelId(null);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete model");
    }
  };

  const activeModel = useMemo(() => {
    const found = models.find((m) => m.id === activeModelId);
    return found ?? {
      id: null,
      name: "No Active Model",
      precision: 0,
      accuracy: 0,
      f1_score: 0,
      is_active: false,
      confusion_matrix: [],
      recall: 0,
      previous_model_id: null,
    };
  }, [models, activeModelId]);

  return (
    <div className="flex w-full bg-white text-black overflow-hidden">
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <h3 className="text-lg font-semibold mb-2">Confirm Model Switch</h3>
          <p className="text-sm text-gray-700 mb-4">
            Are you sure you want to switch from{" "}
            <strong>{activeModel.name}</strong> to{" "}
            <strong>
              {models.find((m) => m.id === selectedModelId)?.name ?? "—"}
            </strong>
            ?
          </p>
          <div className="flex gap-2 justify-end">
            <Button onClick={cancelModelSwitch} variant="destructive">
              Cancel
            </Button>
            <Button onClick={confirmModelSwitch} variant="default">
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden"
        variant="outline"
        size="icon"
        aria-label="Toggle menu"
      >
        <Menu className="w-6 h-6" />
      </Button>

      <Tabs
        onValueChange={() => {
          setIsSidebarOpen(false);
        }}
        defaultValue="overview"
        className="flex flex-row h-full w-full"
      >
        <div
          className={`fixed lg:static inset-0 z-40 lg:z-auto transform transition-transform duration-300 ease-in-out lg:transform-none ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          <div className="relative w-80 h-full border-r bg-white lg:bg-transparent">
            <TabsList className="flex flex-col h-auto w-80 justify-start bg-transparent rounded-none p-4 space-y-2">
              <TabsTrigger
                className="w-full text-lg font-semibold data-[state=active]:bg-accent cursor-pointer"
                value="overview"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                className="w-full text-lg font-semibold data-[state=active]:bg-accent cursor-pointer"
                value="model-control"
              >
                Model Control
              </TabsTrigger>
              <TabsTrigger
                className="w-full text-lg font-semibold data-[state=active]:bg-accent cursor-pointer"
                value="training"
              >
                Training
              </TabsTrigger>
              <TabsTrigger
                className="w-full text-lg font-semibold data-[state=active]:bg-accent cursor-pointer"
                value="retraining"
              >
                Retraining
              </TabsTrigger>
              <TabsTrigger
                className="w-full text-lg font-semibold data-[state=active]:bg-accent cursor-pointer"
                value="data-collection"
              >
                Data Collection
              </TabsTrigger>
              <TabsTrigger
                className="w-full text-lg font-semibold data-[state=active]:bg-accent cursor-pointer"
                value="labels"
              >
                Labels
              </TabsTrigger>
              <TabsTrigger
                className="w-full text-lg font-semibold data-[state=active]:bg-accent cursor-pointer"
                value="manual-testing"
              >
                Manual Testing
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="flex-1 h-full p-4 lg:p-8 overflow-auto">
          <TabsContent value="overview">
            <div>
              <ModelPerformanceMetrics
                modelsAvailable={models.length}
                accuracy={activeModel.accuracy}
                f1Score={activeModel.f1_score}
                precision={activeModel.precision}
                recall={activeModel.recall}
                activeModelName={activeModel.name}
                activeModelId={activeModel.id}
                previousModelId={(activeModel as any).previous_model ?? (activeModel as any).previous_model_id ?? null}
                confusionMatrix={(activeModel as any).confusion_matrix ?? []}
                labels={labels}
              />
            </div>
          </TabsContent>
          <TabsContent value="model-control">
            <div>
              <h2 className="text-2xl font-bold mb-4">
                Model Control Dashboard
              </h2>
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                <strong>Current Active Model:</strong> {activeModel.name}
              </div>

              {loading && <div className="p-4">Loading models...</div>}

              {error && <div className="p-4 text-red-600">{error}</div>}

              {!loading && !error && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full mt-4 min-w-3xl">
                      <thead>
                        <tr className="bg-gray-100 text-left">
                          <th className="p-2">Model ID</th>
                          <th className="p-2">Prev. Model ID</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">Precision</th>
                          <th className="p-2">Accuracy</th>
                          <th className="p-2">F1 Score</th>
                          <th className="p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {models.map((r, i) => (
                          <tr
                            key={i}
                            onClick={() => handleModelClick(r.id)}
                            className={`border-b cursor-pointer transition-colors hover:bg-gray-50 ${
                              activeModelId === r.id ? "bg-green-100" : ""
                            }`}
                          >
                            <td className="p-2">{r.id}</td>
                            <td className="p-2">{r.previous_model ?? "—"}</td>
                            <td className="p-2">
                              {r.name}
                              {activeModelId === r.id && (
                                <span className="ml-2 text-green-600 font-bold">
                                  ✓ Active
                                </span>
                              )}
                            </td>
                            <td className="p-2">{r.precision}</td>
                            <td className="p-2">{r.accuracy}</td>
                            <td className="p-2">{r.f1_score}</td>
                            <td className="p-2">
                              <Button
                                onClick={(e) => handleDeleteModel(e, r.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete model"
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}

                        {tableRows.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center p-4">
                              No models found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    Click on a model row to switch the active model
                  </p>
                </>
              )}
            </div>
          </TabsContent>
          <TabsContent value="retraining">
            <Retraining onModelUpdate={triggerSmartRefetch} />
          </TabsContent>
          <TabsContent value="training">
            <TrainingPanel onModelUpdate={triggerSmartRefetch} />
          </TabsContent>
          <TabsContent value="data-collection">
            <ScrollArea className="h-full">
              <DataCollection />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="labels">
              <Labels />
          </TabsContent>
          <TabsContent value="manual-testing">
              <ManualTesting />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileDown,
  Flag,
  Loader2,
  Play,
  Pencil,
  ShieldCheck,
  Users,
  Radio,
  ScrollText,
  Waypoints,
  RadioTower,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { hasPermission, useAuth } from "@/lib/auth-context";
import type {
  Incident,
  IncidentCommsPlanApplication,
  IncidentLog,
  IncidentPermission,
  IncidentPermissionGrant,
  MeshNodeSnapshot,
  MeshLinkSnapshot,
  MeshSessionDetail as MeshSessionDetailType,
  MeshSessionSummary,
  Operator,
  OperatorCheckIn,
  ResourceCheckIn,
} from "@/lib/types";
import { MeshMap, type MeshMapHandle } from "@/components/MeshMap";
import {
  TeamCardsCapture,
  type TeamCardsCaptureHandle,
} from "@/components/identity/TeamCardsCapture";
import { useTeamIdentities } from "@/lib/useTeamIdentities";
import { resourceTypeColor } from "@/lib/meshVisual";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusVariant: Record<
  Incident["status"],
  "default" | "secondary" | "destructive"
> = {
  PLANNED: "secondary",
  ACTIVE: "default",
  CLOSED: "destructive",
};

function DashboardTile({
  icon: Icon,
  label,
  detail,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/60 hover:border-primary/40"
    >
      <Icon className="size-5 text-muted-foreground" />
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </div>
    </button>
  );
}

export function IncidentDetail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [grantOperatorId, setGrantOperatorId] = useState("");
  const [grantPermission, setGrantPermission] =
    useState<IncidentPermission>("VIEW");
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const mapHandleRef = useRef<MeshMapHandle>(null);
  const teamCardsCaptureRef = useRef<TeamCardsCaptureHandle>(null);

  const { data: incident } = useQuery({
    queryKey: ["incidents", id],
    queryFn: async () => (await api.get<Incident>(`/api/incidents/${id}`)).data,
  });

  const { data: operators } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => (await api.get<Operator[]>("/api/operators")).data,
    enabled: hasPermission(user, "OPERATOR_LIST"),
  });

  const { data: operatorCheckIns } = useQuery({
    queryKey: ["incidents", id, "operator-checkins"],
    queryFn: async () =>
      (
        await api.get<OperatorCheckIn[]>(
          `/api/incidents/${id}/operator-checkins`,
        )
      ).data,
  });

  const { data: resourceCheckIns } = useQuery({
    queryKey: ["incidents", id, "resource-checkins"],
    queryFn: async () =>
      (
        await api.get<ResourceCheckIn[]>(
          `/api/incidents/${id}/resource-checkins`,
        )
      ).data,
  });

  const { data: logs } = useQuery({
    queryKey: ["incidents", id, "logs"],
    queryFn: async () =>
      (await api.get<IncidentLog[]>(`/api/incidents/${id}/logs`)).data,
  });

  const { data: activeCommsPlan } = useQuery({
    queryKey: ["incidents", id, "comms-plan-active"],
    queryFn: async () => {
      const res = await api.get<IncidentCommsPlanApplication | null>(
        `/api/incidents/${id}/comms-plan-applications/active`,
        {
          validateStatus: (status) => status === 200 || status === 204,
        },
      );
      return res.status === 204 ? null : res.data;
    },
  });

  const { data: meshSessions } = useQuery({
    queryKey: ["incidents", id, "mesh-sessions"],
    queryFn: async () =>
      (
        await api.get<MeshSessionSummary[]>(
          `/api/incidents/${id}/mesh-sessions`,
        )
      ).data,
  });

  // The dashboard map overlays the incident's own gear (at each piece's currently-deployed
  // location) with the AREDN links from the most recent scan — a live-vs-snapshot mix, not a
  // rebroadcast of any one scan's node positions. Only the scan's link list and per-node radio
  // metadata (channel/band, for link tooltips/coloring) are pulled from that latest session.
  const latestMeshSession = (meshSessions ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    )[0];

  const { data: latestMeshSessionDetail } = useQuery({
    queryKey: ["incidents", id, "mesh-sessions", latestMeshSession?.id],
    queryFn: async () =>
      (
        await api.get<MeshSessionDetailType>(
          `/api/incidents/${id}/mesh-sessions/${latestMeshSession?.id}`,
        )
      ).data,
    enabled: !!latestMeshSession,
  });

  const { data: permissionGrants } = useQuery({
    queryKey: ["incidents", id, "permissions"],
    queryFn: async () =>
      (
        await api.get<IncidentPermissionGrant[]>(
          `/api/incidents/${id}/permissions`,
        )
      ).data,
    enabled: !!incident?.canEdit,
  });

  const startIncidentMutation = useMutation({
    mutationFn: async () => api.post(`/api/incidents/${id}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents", id] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Incident started");
    },
    onError: () => toast.error("Failed to start incident"),
  });

  const endIncidentMutation = useMutation({
    mutationFn: async () => api.post(`/api/incidents/${id}/end`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents", id] });
      queryClient.invalidateQueries({
        queryKey: ["incidents", id, "operator-checkins"],
      });
      queryClient.invalidateQueries({
        queryKey: ["incidents", id, "resource-checkins"],
      });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Incident ended — all operators and resources checked out");
      setEndDialogOpen(false);
    },
    onError: () => toast.error("Failed to end incident"),
  });

  const addGrantMutation = useMutation({
    mutationFn: async () => {
      const existing = (permissionGrants ?? []).map((g) => ({
        operatorId: g.operatorId,
        permission: g.permission,
      }));
      const grants = [
        ...existing,
        { operatorId: Number(grantOperatorId), permission: grantPermission },
      ];
      return api.put(`/api/incidents/${id}/permissions`, { grants });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["incidents", id, "permissions"],
      });
      toast.success("Permission granted");
      setGrantOperatorId("");
    },
    onError: () => toast.error("Failed to grant permission"),
  });

  const revokeGrantMutation = useMutation({
    mutationFn: async (target: {
      operatorId: number;
      permission: IncidentPermission;
    }) => {
      const grants = (permissionGrants ?? [])
        .filter(
          (g) =>
            !(
              g.operatorId === target.operatorId &&
              g.permission === target.permission
            ),
        )
        .map((g) => ({ operatorId: g.operatorId, permission: g.permission }));
      return api.put(`/api/incidents/${id}/permissions`, { grants });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["incidents", id, "permissions"],
      });
      toast.success("Permission revoked");
    },
    onError: () => toast.error("Failed to revoke permission"),
  });

  const team = useTeamIdentities(operatorCheckIns, operators, incident, user);

  if (!incident) return null;

  const canEdit = incident.canEdit;
  const isClosed = incident.status === "CLOSED";
  const isPlanned = incident.status === "PLANNED";
  const isActive = incident.status === "ACTIVE";

  const openOperatorCheckIns =
    operatorCheckIns?.filter((c) => !c.checkedOutAt) ?? [];
  const openResourceCheckIns =
    resourceCheckIns?.filter((c) => !c.checkedOutAt) ?? [];

  // Once an incident is CLOSED every check-in gets auto-checked-out (see endIncidentMutation),
  // so `openResourceCheckIns` goes empty and the map would otherwise go blank. The historical
  // check-in rows still carry their `deploymentLocationId`/lat-lng permanently (checkout only
  // sets `checkedOutAt`, per OperatorCheckInService.checkOutAllOpen on the backend), so for a
  // closed incident we fall back to each resource's most recent check-in on this incident —
  // its "last known deployment location" — instead of requiring it to still be checked in.
  const gearCheckIns = isClosed
    ? Array.from(
        (resourceCheckIns ?? [])
          .slice()
          .sort(
            (a, b) =>
              new Date(b.checkedInAt).getTime() -
              new Date(a.checkedInAt).getTime(),
          )
          .reduce((byResource, c) => {
            if (!byResource.has(c.resourceId)) byResource.set(c.resourceId, c);
            return byResource;
          }, new Map<number, ResourceCheckIn>())
          .values(),
      )
    : openResourceCheckIns;

  // One marker per deployed piece of gear, placed at its own checkin's lat/lng (which the
  // backend denormalizes from its deployment location) — not the scan's node positions, so a
  // gear item moved to a new location since the last scan still shows up where it actually is
  // now. When a deployed item's identifier matches a hostname from the latest scan, its radio
  // metadata (channel/band) is borrowed from that scan node purely for link tooltip/color
  // accuracy — position always comes from the checkin.
  const scanNodeByHostname = new Map(
    (latestMeshSessionDetail?.nodes ?? []).map((n) => [
      n.hostname.toLowerCase(),
      n,
    ]),
  );
  function checkInToMapNode(
    c: ResourceCheckIn,
    scanNode: MeshNodeSnapshot | undefined,
  ): MeshNodeSnapshot & { offSite?: boolean; resourceTypeName?: string | null } {
    return {
      id: c.id,
      hostname: c.resourceIdentifier,
      isLocalNode: false,
      macAddress: null,
      meshIpAddress: null,
      linkLocalAddress: null,
      model: null,
      firmwareVersion: null,
      latitude: c.latitude,
      longitude: c.longitude,
      claimedDistanceMi: null,
      channel: scanNode?.channel ?? null,
      band: scanNode?.band ?? null,
      frequencyMhz: scanNode?.frequencyMhz ?? null,
      channelWidth: scanNode?.channelWidth ?? null,
      rfPowerDbm: scanNode?.rfPowerDbm ?? null,
      resourceId: c.resourceId,
      resourceIdentifier: c.resourceIdentifier,
      resourceOwnerCallsign: null,
      resourceCustomFields: null,
      offSite: c.offSite,
      resourceTypeName: c.resourceTypeName,
    };
  }
  const dashboardMapNodes: (MeshNodeSnapshot & {
    offSite?: boolean;
    resourceTypeName?: string | null;
  })[] = gearCheckIns
    .filter((c) => c.latitude && c.longitude)
    .map((c) =>
      checkInToMapNode(
        c,
        scanNodeByHostname.get(c.resourceIdentifier.toLowerCase()),
      ),
    );
  // The scan can include nodes that aren't a currently-open check-in on this incident (checked
  // out already, or never checked in here at all) — those still need a marker or any link
  // touching them would silently disappear (MeshMap only draws a link when both endpoints have a
  // plotted position). Add them using the scan's own resolved lat/lng, which the mesh-scan submit
  // endpoint already backfills from the resource's last-known deployment location, so it's still
  // the best available position for a node that isn't part of the "currently deployed" set above.
  const plottedHostnames = new Set(
    dashboardMapNodes.map((n) => n.hostname.toLowerCase()),
  );
  for (const scanNode of latestMeshSessionDetail?.nodes ?? []) {
    if (plottedHostnames.has(scanNode.hostname.toLowerCase())) continue;
    if (!scanNode.latitude || !scanNode.longitude) continue;
    plottedHostnames.add(scanNode.hostname.toLowerCase());
    dashboardMapNodes.push({ ...scanNode, offSite: true });
  }
  const dashboardMapLinks = latestMeshSessionDetail?.links ?? [];
  const dashboardMapTypes = [
    ...new Set(
      dashboardMapNodes
        .map((n) => n.resourceTypeName)
        .filter((t): t is string => !!t),
    ),
  ].sort((a, b) => a.localeCompare(b));

  // PDF map: the last mesh scan's own nodes (real network topology, so only its own links are
  // drawn — no synthetic connectivity) plus every other currently-deployed piece of gear that
  // isn't itself a scanned node (batteries, cameras, repeaters, etc.), so the printed map shows
  // everything on site, not just the mesh — unlike the dashboard map above, which only
  // supplements with off-site scan nodes, this deliberately excludes those (a scan node with no
  // current check-in on this incident has no business appearing on an incident-scoped export).
  const pdfScanNodes = latestMeshSessionDetail?.nodes ?? [];
  const pdfScanHostnames = new Set(
    pdfScanNodes.map((n) => n.hostname.toLowerCase()),
  );
  const pdfMapNodes: (MeshNodeSnapshot & {
    offSite?: boolean;
    resourceTypeName?: string | null;
  })[] = [
    ...pdfScanNodes,
    ...gearCheckIns
      .filter((c) => c.latitude && c.longitude)
      .filter((c) => !pdfScanHostnames.has(c.resourceIdentifier.toLowerCase()))
      .map((c) => checkInToMapNode(c, undefined)),
  ];
  const pdfMapLinks = latestMeshSessionDetail?.links ?? [];

  const fmt = (v: string | null) =>
    v
      ? new Date(v).toLocaleString(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "—";

  return (
    <div className="flex flex-col gap-6">
      <TeamCardsCapture ref={teamCardsCaptureRef} team={team} />
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/incidents")}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="size-4" />
          Back to Incidents
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{incident.name}</h1>
              <Badge variant={statusVariant[incident.status]}>
                {incident.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{incident.location}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setPdfDialogOpen(true)}>
              <FileDown className="size-4" />
              Generate PDF
            </Button>
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => setPermissionsOpen(true)}
              >
                <ShieldCheck className="size-4" />
                Permissions
              </Button>
            )}
            <Button
              variant="outline"
              disabled={!canEdit || isClosed}
              title={
                canEdit
                  ? "Edit incident"
                  : "Requires edit access to this incident"
              }
              onClick={() => navigate(`/incidents/${id}/edit`)}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
            {isPlanned && (
              <Button
                variant="outline"
                disabled={!canEdit || startIncidentMutation.isPending}
                title={
                  canEdit
                    ? "Start incident"
                    : "Requires edit access to this incident"
                }
                onClick={() => startIncidentMutation.mutate()}
              >
                <Play className="size-4" />
                Start Incident
              </Button>
            )}
            {isActive && (
              <Button
                variant="outline"
                disabled={!canEdit}
                title={
                  canEdit
                    ? "End incident"
                    : "Requires edit access to this incident"
                }
                onClick={() => setEndDialogOpen(true)}
              >
                <Flag className="size-4" />
                End Incident
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <DashboardTile
          icon={Users}
          label="Team, and timesheet"
          detail={`${openOperatorCheckIns.length} deployed`}
          onClick={() => navigate(`/incidents/${id}/operators`)}
        />
        <DashboardTile
          icon={Radio}
          label="Gear"
          detail={`${openResourceCheckIns.length} deployed`}
          onClick={() => navigate(`/incidents/${id}/gear`)}
        />
        <DashboardTile
          icon={ScrollText}
          label="Message Logs"
          detail={`${logs?.length ?? 0} entries`}
          onClick={() => navigate(`/incidents/${id}/logs`)}
        />
        <DashboardTile
          icon={Waypoints}
          label="Comms Plan"
          detail={activeCommsPlan ? activeCommsPlan.planName : "None applied"}
          onClick={() => navigate(`/incidents/${id}/comms-plan`)}
        />
        <DashboardTile
          icon={RadioTower}
          label="Mesh"
          detail={`${meshSessions?.length ?? 0} scan${meshSessions?.length === 1 ? "" : "s"}`}
          onClick={() => navigate(`/incidents/${id}/mesh`)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Title</div>
              <div className="text-sm font-medium">{incident.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Description</div>
              <div className="text-sm">
                {incident.description || (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Planned</div>
                <div className="text-sm">
                  {fmt(incident.plannedStartTime)} –{" "}
                  {fmt(incident.plannedEndTime)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Actual</div>
                <div className="text-sm">
                  {fmt(incident.actualStartTime)} –{" "}
                  {fmt(incident.actualEndTime)}
                </div>
              </div>
            </div>
            {canEdit && (
              <div>
                <div className="text-xs text-muted-foreground">Created By</div>
                <div className="text-sm">
                  {incident.createdByCallsign ?? "System"} at{" "}
                  {new Date(incident.createdAt).toLocaleString()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Map</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <MeshMap
              ref={mapHandleRef}
              nodes={dashboardMapNodes}
              links={dashboardMapLinks}
              boundaryPoints={incident.boundaryPoints}
            />
            {dashboardMapTypes.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                {dashboardMapTypes.map((type) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <span
                      className="inline-block size-2.5 rounded-full border border-credential-blue-deep"
                      style={{ background: resourceTypeColor(type) }}
                    />
                    <span>{type}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Incident</DialogTitle>
            <DialogDescription>
              This will close "{incident.name}" and automatically check out{" "}
              {openOperatorCheckIns.length} operator
              {openOperatorCheckIns.length === 1 ? "" : "s"} and{" "}
              {openResourceCheckIns.length} piece
              {openResourceCheckIns.length === 1 ? "" : "s"} of equipment still
              on scene. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={endIncidentMutation.isPending}
              onClick={() => endIncidentMutation.mutate()}
            >
              End Incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Incident Permissions</DialogTitle>
            <DialogDescription>
              Grant operators VIEW or EDIT access to this specific incident.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {permissionGrants && permissionGrants.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {permissionGrants.map((g) => (
                  <li
                    key={`${g.operatorId}-${g.permission}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {g.operatorCallsign} —{" "}
                      <span className="text-muted-foreground">
                        {g.permission}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={revokeGrantMutation.isPending}
                      onClick={() =>
                        revokeGrantMutation.mutate({
                          operatorId: g.operatorId,
                          permission: g.permission,
                        })
                      }
                    >
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No per-incident grants yet.
              </p>
            )}
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <label
                  className="text-xs text-muted-foreground"
                  htmlFor="grantOperator"
                >
                  Operator
                </label>
                <Select
                  value={grantOperatorId}
                  onValueChange={setGrantOperatorId}
                >
                  <SelectTrigger id="grantOperator">
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators?.map((op) => (
                      <SelectItem key={op.id} value={String(op.id)}>
                        {op.callsign}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs text-muted-foreground"
                  htmlFor="grantPermission"
                >
                  Permission
                </label>
                <Select
                  value={grantPermission}
                  onValueChange={(v: IncidentPermission) =>
                    setGrantPermission(v)
                  }
                >
                  <SelectTrigger id="grantPermission" className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEW">VIEW</SelectItem>
                    <SelectItem value="EDIT">EDIT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                disabled={!grantOperatorId || addGrantMutation.isPending}
                onClick={() => addGrantMutation.mutate()}
              >
                Grant
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GenerateIncidentPdfDialog
        open={pdfDialogOpen}
        onOpenChange={setPdfDialogOpen}
        incidentId={id}
        incident={incident}
        nodes={pdfMapNodes}
        links={pdfMapLinks}
        mapHandleRef={mapHandleRef}
        teamCardsCaptureRef={teamCardsCaptureRef}
      />
    </div>
  );
}

type PdfOrientation = "LANDSCAPE" | "PORTRAIT";

function GenerateIncidentPdfDialog({
  open,
  onOpenChange,
  incidentId,
  incident,
  nodes,
  links,
  mapHandleRef,
  teamCardsCaptureRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentId: string | undefined;
  incident: Incident | undefined;
  nodes: (MeshNodeSnapshot & {
    offSite?: boolean;
    resourceTypeName?: string | null;
  })[];
  links: MeshLinkSnapshot[];
  mapHandleRef: React.RefObject<MeshMapHandle | null>;
  teamCardsCaptureRef: React.RefObject<TeamCardsCaptureHandle | null>;
}) {
  const [orientation, setOrientation] = useState<PdfOrientation>("LANDSCAPE");
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      // The PDF map (passed in as `nodes`/`links`, built as `pdfMapNodes`/`pdfMapLinks` above)
      // plots every currently-deployed piece of gear, mesh nodes and non-network gear alike
      // (batteries, cameras, repeaters, etc., each colored by type) — but the *links* are only
      // ever the most recent mesh scan's own, real, discovered connectivity, never synthesized
      // for the non-scanned gear. No per-node hostname / per-link channel text either — an
      // incident-wide view often has many nodes close together, and the overlapping labels
      // become illegible noise rather than useful detail. The color-coded legend already
      // explains what each marker and link color mean.
      // fitToBoundary: true reframes the map to the incident's full boundary before capturing —
      // some zoom, but the whole incident area always fits — rather than whatever pan/zoom the
      // operator happened to be looking at on screen when they clicked Generate PDF.
      const mapImageBase64 = await mapHandleRef.current?.captureSnapshot({
        nodes,
        links,
        showLabels: false,
        fitToBoundary: true,
      });
      if (!mapImageBase64) {
        toast.error("Map is not ready yet — try again in a moment");
        setGenerating(false);
        return;
      }
      const teamCardsImageBase64 =
        (await teamCardsCaptureRef.current?.capturePages()) ?? [];
      const response = await api.post(
        `/api/incidents/${incidentId}/pdf`,
        { orientation, mapImageBase64, teamCardsImageBase64 },
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Incident-${(incident?.name || "incident").replace(/[^a-zA-Z0-9-]+/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      onOpenChange(false);
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Incident PDF</DialogTitle>
          <DialogDescription>
            Includes a summary, map, operator time sheet, communications plan,
            message log, mesh scan history, and deployment locations with their
            gear.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Map Orientation</Label>
            <Select
              value={orientation}
              onValueChange={(v) => setOrientation(v as PdfOrientation)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LANDSCAPE">Horizontal</SelectItem>
                <SelectItem value="PORTRAIT">Vertical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4" />
            )}
            Generate PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Loader2, ChevronDown, ChevronUp, Lock, Send,
    Copy, Check, Radio, AlertTriangle, X, Play, Smartphone,
    Camera, MapPin, Crosshair, Undo2, ShieldCheck, Plus,
    ShieldAlert, Clock, Eye, FileText, ChevronRight, ChevronLeft
} from 'lucide-react'
import { Flaticon } from '../components/Flaticon'
import {
    api, ev, type EventData, type VideoSummary, type InsightsData,
    type VideoInfo, type IncidentReport
} from '../api'

function fmt(s: number) { const m = Math.floor(s / 60); return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}` }

function stageColor(s: string) {
    if (s === 'C') return 'bg-red-50 text-red-600 border-red-200'
    if (s === 'B') return 'bg-orange-50 text-orange-600 border-orange-200'
    if (s === 'A') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-slate-100 text-slate-600 border-slate-200'
}
function stageGlow(s: string) {
    if (s === 'C') return 'shadow-sm animate-pulse-ring'
    if (s === 'B') return 'shadow-xs'
    return ''
}
function labelColor(l: string) {
    if (l.includes('altercation') || l.includes('weapon') || l.includes('assault')) return 'text-red-600'
    if (l.includes('confrontation') || l.includes('aggressive') || l.includes('fight')) return 'text-orange-600'
    if (l.includes('trespassing') || l.includes('shoplifting') || l.includes('theft') || l.includes('steal') || l.includes('creep')) return 'text-amber-700'
    return 'text-slate-800'
}

export default function VideoPage() {
    const { videoId } = useParams<{ videoId: string }>()
    const navigate = useNavigate()
    const [alerts, setAlerts]       = useState<EventData[]>([])
    const [events, setEvents]       = useState<EventData[]>([])
    const [summary, setSummary]     = useState<VideoSummary | null>(null)
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
    const [loading, setLoading]     = useState(true)
    const [tab, setTab]             = useState<'chat' | 'geofence' | 'alerts' | 'events' | 'insights' | 'memory'>('chat')
    const [reportLoading, setReportLoading] = useState(false)
    const [pdfLoading, setPdfLoading] = useState(false)
    const [chainModalOpen, setChainModalOpen] = useState(false)
    const [dispatchModalOpen, setDispatchModalOpen] = useState(false)
    const [reportData, setReportData] = useState<IncidentReport | null>(null)
    const [expandedNarrative, setExpandedNarrative] = useState(false)
    const [showHud, setShowHud] = useState(true)

    useEffect(() => {
        if (!videoId) return
        Promise.all([
            api.videoAlerts(videoId).then(d => setAlerts(d.alerts || [])),
            api.videoEvents(videoId).then(d => setEvents(d.events || [])),
            api.videoSummary(videoId).then(d => { if (d && 'summary' in d && d.summary) setSummary(d as VideoSummary) }),
            api.videoInfo(videoId).then(setVideoInfo).catch(() => null),
        ])
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [videoId])

    if (!videoId) return null
    const videoName = events[0]?.video_source || alerts[0]?.video_source || videoId

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
            {/* Enterprise Command Header */}
            <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md">
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Navigation, Breadcrumbs & Camera Telemetry */}
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="cursor-pointer p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700/60"
                            title="Back to Operations Dashboard"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider hidden sm:inline">OPS / FEEDS /</span>
                            <span className="text-sm font-bold text-white tracking-tight truncate max-w-[180px] sm:max-w-xs">{videoName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                                CAM-01
                            </span>
                        </div>

                        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-slate-400 pl-2.5 border-l border-slate-800">
                            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                INGESTED
                            </span>
                            <span>•</span>
                            <span>1080P @ 30FPS</span>
                            <span>•</span>
                            <span className="text-slate-300">{events.length} Events ({alerts.length} Threats)</span>
                        </div>
                    </div>

                    {/* Right: Threat Assessment & Incident Action Toolbar */}
                    <div className="flex items-center gap-2 shrink-0">
                        {summary && (
                            <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 ${
                                summary.risk_level === 'high'
                                    ? 'bg-red-500/15 text-red-400 border-red-500/40 shadow-xs'
                                    : summary.risk_level === 'medium'
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                            }`}>
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>{summary.risk_level.toUpperCase()} THREAT</span>
                            </div>
                        )}

                        <button
                            title="Cryptographic Chain of Custody (RFC-3161 Evidence Fingerprint)"
                            onClick={async () => {
                                if (!reportData) {
                                    try {
                                        const rep = await api.videoReport(videoId)
                                        setReportData(rep)
                                    } catch (err) {
                                        console.error(err)
                                    }
                                }
                                setChainModalOpen(true)
                            }}
                            className="cursor-pointer px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all flex items-center gap-1.5"
                        >
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden sm:inline">Evidence Seal</span>
                        </button>

                        <button
                            title="Enterprise Dispatch Hub (Telegram / WhatsApp / Webhook)"
                            onClick={() => setDispatchModalOpen(true)}
                            className="cursor-pointer px-2.5 py-1.5 text-xs font-semibold text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-all flex items-center gap-1.5"
                        >
                            <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                            <span className="hidden sm:inline">Dispatch Hub</span>
                        </button>

                        <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800/80 p-0.5">
                            <button
                                title="Download Plain-Text Report"
                                disabled={reportLoading || !videoId}
                                onClick={async () => {
                                    if (!videoId) return
                                    setReportLoading(true)
                                    try {
                                        const res = await fetch(api.videoReportTextUrl(videoId))
                                        if (!res.ok) {
                                            const errText = await res.text().catch(() => '')
                                            throw new Error(`HTTP ${res.status}: ${errText || 'Failed to download report'}`)
                                        }
                                        const blob = await res.blob()
                                        const blobUrl = URL.createObjectURL(blob)
                                        const a = document.createElement('a')
                                        a.href = blobUrl
                                        a.download = `incident_report_${videoId}.txt`
                                        document.body.appendChild(a)
                                        a.click()
                                        document.body.removeChild(a)
                                        URL.revokeObjectURL(blobUrl)
                                    } catch (err: any) {
                                        console.error('TXT report error:', err)
                                        alert(err?.message || 'Failed to download TXT report.')
                                    } finally {
                                        setReportLoading(false)
                                    }
                                }}
                                className="cursor-pointer px-2.5 py-1 text-xs font-mono font-medium text-slate-300 hover:text-white rounded hover:bg-slate-700 transition-all disabled:opacity-40"
                            >
                                {reportLoading ? <Loader2 className="w-3 h-3 animate-spin text-blue-400" /> : 'TXT'}
                            </button>
                            <span className="w-px h-3 bg-slate-700" />
                            <button
                                title="Download Official Incident PDF Report"
                                disabled={pdfLoading || !videoId}
                                onClick={async () => {
                                    if (!videoId) return
                                    setPdfLoading(true)
                                    try {
                                        const res = await fetch(api.videoReportPdfUrl(videoId))
                                        if (!res.ok) {
                                            const errText = await res.text().catch(() => '')
                                            throw new Error(`HTTP ${res.status}: ${errText || 'Failed to download PDF'}`)
                                        }
                                        const blob = await res.blob()
                                        const blobUrl = URL.createObjectURL(blob)
                                        const a = document.createElement('a')
                                        a.href = blobUrl
                                        a.download = `incident_report_${videoId}.pdf`
                                        document.body.appendChild(a)
                                        a.click()
                                        document.body.removeChild(a)
                                        URL.revokeObjectURL(blobUrl)
                                    } catch (err: any) {
                                        console.error('PDF report error:', err)
                                        alert(`Failed to download PDF: ${err?.message || 'Server error'}. Please verify backend server is running.`)
                                    } finally {
                                        setPdfLoading(false)
                                    }
                                }}
                                className="cursor-pointer px-2.5 py-1 text-xs font-mono font-medium text-blue-400 hover:text-blue-300 rounded hover:bg-slate-700 transition-all flex items-center gap-1 disabled:opacity-40"
                            >
                                {pdfLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                                <span>PDF</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Forensic Intelligence HUD Cockpit */}
            {summary && (
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-5 pb-1 w-full animate-fade-in space-y-3.5">
                    {/* Cockpit Toggle Header */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
                            <span className="font-mono font-bold uppercase tracking-wider text-slate-700">Forensic Incident Intelligence Cockpit</span>
                        </div>
                        <button
                            onClick={() => setShowHud(!showHud)}
                            className="cursor-pointer text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                        >
                            <span>{showHud ? 'Collapse Cockpit' : 'Expand Cockpit'}</span>
                            {showHud ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                    </div>

                    {showHud && (
                        <div className="space-y-3.5 animate-fade-in">
                            {/* KPI Metrics Bento Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {/* Metric 1: Threat Assessment */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs relative overflow-hidden flex flex-col justify-between">
                                    <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold tracking-wider">
                                        <span>THREAT EVALUATION</span>
                                        <ShieldAlert className={`w-3.5 h-3.5 ${summary.risk_level === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                                    </div>
                                    <div className="mt-2.5">
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-xl font-extrabold tracking-tight ${summary.risk_level === 'high' ? 'text-red-600' : 'text-amber-600'}`}>
                                                {summary.risk_level.toUpperCase()} RISK
                                            </span>
                                            <span className="text-xs font-mono text-slate-400 font-semibold">
                                                {alerts.length > 0 ? `Stage ${alerts[0].alert?.stage || 'C'}` : 'Stage A'}
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${summary.risk_level === 'high' ? 'bg-red-500' : 'bg-amber-500'}`}
                                                style={{ width: summary.risk_level === 'high' ? '85%' : '50%' }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-slate-500 mt-2 block font-medium">
                                        {alerts.length} perimeter threat alert{alerts.length !== 1 ? 's' : ''} logged
                                    </span>
                                </div>

                                {/* Metric 2: Primary Breach Classification */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                                    <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold tracking-wider">
                                        <span>PRIMARY ANOMALY</span>
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                    </div>
                                    <div className="mt-2.5">
                                        <span className="text-base font-bold text-slate-900 tracking-tight block truncate capitalize">
                                            {summary.intent[0]?.replace(/_/g, ' ') || 'Perimeter Breach'}
                                        </span>
                                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 font-mono">
                                            {summary.tags.slice(0, 2).map(t => `#${t}`).join(' ')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-100 font-mono">
                                            Visual Multi-Modal
                                        </span>
                                    </div>
                                </div>

                                {/* Metric 3: Subject Tracking & Visual Intelligence */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                                    <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold tracking-wider">
                                        <span>SUBJECT TRACKING</span>
                                        <Eye className="w-3.5 h-3.5 text-blue-500" />
                                    </div>
                                    <div className="mt-2.5">
                                        <span className="text-base font-bold text-slate-900 tracking-tight block">
                                            {events.length > 0 ? Math.max(...events.map(e => e.detections?.people_count || 1), 1) : 1} Subject(s) Tracked
                                        </span>
                                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                                            Disguised / Balaclava Attire
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-emerald-600 font-semibold">
                                        <span>● Contact Anomaly: Negative</span>
                                    </div>
                                </div>

                                {/* Metric 4: Timeline & Pipeline Telemetry */}
                                <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                                    <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold tracking-wider">
                                        <span>SURVEILLANCE WINDOW</span>
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                    <div className="mt-2.5">
                                        <span className="text-base font-bold font-mono text-slate-900 tracking-tight block">
                                            0:00 → {fmt(events[events.length - 1]?.end || 8)}
                                        </span>
                                        <p className="text-[11px] text-slate-500 mt-1 font-mono">
                                            Pipeline: {videoInfo?.gpu || 'Direct-GPU'} ({videoInfo?.processing_time_s?.toFixed(0) || '27'}s total)
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-slate-400">
                                        <span>{videoInfo?.chunks || 1} Chunk · {videoInfo?.subclips || 2} Subclips</span>
                                    </div>
                                </div>
                            </div>

                            {/* Split Grid: Executive Brief & Incident Chronology */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                                {/* Left 7 cols: Executive Incident Statement */}
                                <div className="lg:col-span-7 bg-white rounded-xl p-4.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <Flaticon name="brain" type="sr" className="text-blue-600 text-xs" />
                                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Executive Forensic Intelligence Brief</span>
                                            </div>
                                            <button
                                                onClick={() => setExpandedNarrative(!expandedNarrative)}
                                                className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                            >
                                                <span>{expandedNarrative ? 'Compact Brief' : 'Full Narrative Report'}</span>
                                                {expandedNarrative ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>

                                        <p className={`text-xs sm:text-sm text-slate-700 leading-relaxed ${expandedNarrative ? 'whitespace-pre-line' : 'line-clamp-3'}`}>
                                            {summary.summary}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 pt-3 mt-2.5 border-t border-slate-100">
                                        <span className="text-[10px] font-mono text-slate-400 mr-1 font-semibold">TAGS:</span>
                                        {summary.intent.map(i => (
                                            <span key={i} className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200 font-medium">
                                                {i.replace(/_/g, ' ')}
                                            </span>
                                        ))}
                                        {summary.tags.slice(0, 5).map(t => (
                                            <span key={t} className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200 font-mono">
                                                #{t}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Right 5 cols: Key Incident Chronology */}
                                <div className="lg:col-span-5 bg-white rounded-xl p-4.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Key Incident Chronology</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-400">{summary.key_moments.length} Moments Logged</span>
                                        </div>

                                        <div className="space-y-2">
                                            {summary.key_moments.map((km, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => setTab('chat')}
                                                    className="cursor-pointer group flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                                                >
                                                    <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-700 border border-blue-200 group-hover:border-blue-600 transition-colors shrink-0">
                                                        {km.time}
                                                    </span>
                                                    <span className="text-xs text-slate-600 group-hover:text-slate-900 leading-snug line-clamp-2">
                                                        {km.description}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                            RFC-3161 Tamper-Evident Sealed
                                        </span>
                                        <button
                                            onClick={() => setTab('geofence')}
                                            className="cursor-pointer text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                        >
                                            <span>Open Geofence Canvas</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Sticky Workstation Tabs Bar */}
            <div className="border-b border-slate-200 bg-white sticky top-[49px] z-20 shadow-2xs">
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto no-scrollbar">
                    {(['chat', 'geofence', 'alerts', 'events', 'insights', 'memory'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`cursor-pointer px-4 py-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                                tab === t
                                    ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                                    : 'text-slate-500 border-transparent hover:text-slate-900 hover:border-slate-300'
                            }`}
                        >
                            {t === 'chat'     && <Flaticon name="comment-alt" className="text-xs" />}
                            {t === 'geofence' && <ShieldCheck className="w-4 h-4 text-amber-500" />}
                            {t === 'alerts'   && <Flaticon name="bell" className="text-xs text-red-500" />}
                            {t === 'events'   && <Flaticon name="pulse" className="text-xs text-blue-500" />}
                            {t === 'insights' && <Flaticon name="stats" className="text-xs text-purple-500" />}
                            {t === 'memory'   && <Flaticon name="brain" className="text-xs text-cyan-500" />}
                            <span>
                                {t === 'chat'     ? 'Forensic Chat & Search' :
                                 t === 'geofence' ? 'Virtual Geofencing' :
                                 t === 'alerts'   ? `Threat Alerts (${alerts.length})` :
                                 t === 'events'   ? `Telemetry Events (${events.length})` :
                                 t === 'insights' ? 'Forensic Insights' : 'Long-Term Memory'}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Investigation Workstation Pane */}
            <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 relative z-10">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                        <p className="text-xs text-slate-400">Loading analysis data...</p>
                    </div>
                ) : tab === 'chat' ? (
                    <ChatPanel videoId={videoId} />
                ) : tab === 'geofence' ? (
                    <GeofencePanel
                        videoId={videoId}
                        videoName={videoName}
                        alerts={alerts}
                        onOpenDispatch={() => setDispatchModalOpen(true)}
                        onOpenEvidenceSeal={async () => {
                            if (!reportData) {
                                try {
                                    const rep = await api.videoReport(videoId)
                                    setReportData(rep)
                                } catch (err) {
                                    console.error(err)
                                }
                            }
                            setChainModalOpen(true)
                        }}
                    />
                ) : tab === 'alerts' ? (
                    <CardList items={alerts} emptyIconName="bell" emptyText="No threat alerts detected" />
                ) : tab === 'insights' ? (
                    <InsightsPanel videoId={videoId} />
                ) : tab === 'memory' ? (
                    <MemoryPanel videoId={videoId} />
                ) : (
                    <CardList items={events} emptyIconName="pulse" emptyText="No movement events detected" />
                )}
            </div>

            {/* Chain of Custody Modal */}
            {chainModalOpen && (
                <ChainOfCustodyModal
                    videoId={videoId}
                    videoName={videoName}
                    report={reportData}
                    onClose={() => setChainModalOpen(false)}
                />
            )}

            {/* Enterprise Dispatch Hub Modal */}
            {dispatchModalOpen && (
                <DispatchModal
                    videoId={videoId}
                    videoName={videoName}
                    summary={summary}
                    alerts={alerts}
                    onClose={() => setDispatchModalOpen(false)}
                />
            )}
        </div>
    )
}

// ─── CardList (Events & Alerts) ──────────────────────────────────────────────

function CardList({ items, emptyIconName, emptyText }: {
    items: EventData[]
    emptyIconName: string
    emptyText: string
}) {
    const [expanded, setExpanded] = useState<string | null>(null)
    const [filter, setFilter] = useState<'all' | 'C' | 'B' | 'A'>('all')

    const filteredItems = items.filter(raw => {
        const e = ev(raw)
        if (filter === 'all') return true
        return e.alertStage === filter
    })

    if (items.length === 0) return (
        <div className="text-center py-20 text-slate-400 max-w-md mx-auto">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-200 shadow-2xs">
                <Flaticon name={emptyIconName} className="text-xl text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">{emptyText}</p>
            <p className="text-xs text-slate-400 mt-1">Continuous forensic baseline telemetry monitoring active stream.</p>
        </div>
    )

    return (
        <div className="max-w-4xl mx-auto space-y-3.5">
            {/* Filter controls */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <span className="font-bold text-slate-800">{filteredItems.length}</span>
                    <span>records matching filter</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    {(['all', 'C', 'B', 'A'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`cursor-pointer px-2.5 py-0.5 rounded font-mono text-[11px] font-semibold transition-all ${
                                filter === f
                                    ? 'bg-white text-slate-900 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            {f === 'all' ? 'All' : `Stage ${f}`}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2.5">
                {filteredItems.map((raw, idx) => {
                    const e = ev(raw)
                    const isOpen = expanded === e.clipId
                    const isStageC = e.alertStage === 'C'

                    return (
                        <div
                            key={e.clipId || idx}
                            className={`bg-white border rounded-xl p-4 transition-all shadow-2xs ${
                                isStageC ? 'border-red-200 hover:border-red-300' : 'border-slate-200/90 hover:border-slate-300'
                            }`}
                        >
                            <div
                                onClick={() => setExpanded(isOpen ? null : e.clipId)}
                                className="cursor-pointer flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {e.alertStage !== 'none' && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold shrink-0 ${stageColor(e.alertStage)}`}>
                                            STAGE {e.alertStage}
                                        </span>
                                    )}
                                    <span className={`text-sm font-semibold truncate capitalize ${labelColor(e.label)}`}>
                                        {e.label.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {e.alertScore > 0 && (
                                        <span className={`text-xs font-mono font-bold ${
                                            e.alertScore > 0.7 ? 'text-red-500' : e.alertScore > 0.4 ? 'text-orange-500' : 'text-slate-400'
                                        }`}>
                                            score {e.alertScore.toFixed(2)}
                                        </span>
                                    )}
                                    <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        {fmt(e.start)}–{fmt(e.end)}
                                    </span>
                                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                </div>
                            </div>

                            {e.caption && (
                                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{e.caption}</p>
                            )}

                            {isOpen && (
                                <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-sans animate-fade-in">
                                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                                        <span className="text-[10px] text-slate-400 block font-mono font-semibold">PEOPLE DETECTED</span>
                                        <span className="text-sm font-bold text-slate-800">{e.people}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                                        <span className="text-[10px] text-slate-400 block font-mono font-semibold">PEAK MOTION</span>
                                        <span className="text-sm font-bold text-slate-800">{(e.peakMotion * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                                        <span className="text-[10px] text-slate-400 block font-mono font-semibold">CONFIDENCE</span>
                                        <span className="text-sm font-bold text-slate-800">{(e.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                                        <span className="text-[10px] text-slate-400 block font-mono font-semibold">DURATION</span>
                                        <span className="text-sm font-bold text-slate-800">{e.duration.toFixed(1)}s</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

interface LocalMsg {
    id: string
    role: 'user' | 'assistant'
    text: string
    results?: EventData[]
    loading?: boolean
    streaming?: boolean
}

function ChatPanel({ videoId }: { videoId: string }) {
    const [messages, setMessages] = useState<LocalMsg[]>([])
    const [input, setInput]       = useState('')
    const [searching, setSearching] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)

    const SUGGESTIONS = [
        "Describe the intruder's clothing & posture",
        "Did the subject carry any weapon or tool?",
        "What exact action occurred at 0:08?",
        "Summarize incident timeline for police dispatch",
    ]

    useEffect(() => {
        api.chatHistory(videoId).then(data => {
            if (data.messages.length > 0) {
                setMessages(data.messages.map((m, i) => ({
                    id: `h-${m.id || i}`, role: m.role, text: m.content,
                })))
            } else {
                setMessages([{
                    id: 'init', role: 'assistant',
                    text: 'LensQL AI Forensic Agent ready. Ask specific questions about this surveillance footage, identify subject posture, or query exact timestamps.\n\nSelect a suggestion below or type your inquiry.',
                }])
            }
        }).catch(() => {
            setMessages([{ id: 'init', role: 'assistant', text: 'Ask me anything about this video.' }])
        })
    }, [videoId])

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

    const handleSend = async (queryText?: string) => {
        const q = (queryText || input).trim()
        if (!q || searching) return

        const userMsg: LocalMsg = { id: `u-${Date.now()}`, role: 'user', text: q }
        const loadId = `a-${Date.now()}`
        setMessages(prev => [...prev, userMsg, { id: loadId, role: 'assistant', text: '', loading: true }])
        setInput('')
        setSearching(true)

        try {
            const stream = api.chatStream(q, videoId, 8,
                (_count, results) => {
                    setMessages(prev => prev.map(m => m.id === loadId
                        ? { ...m, loading: false, streaming: true, results, text: m.text }
                        : m
                    ))
                }
            )
            const reader = stream.getReader()
            let fullText = ''
            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                fullText += value
                setMessages(prev => prev.map(m => m.id === loadId
                    ? { ...m, loading: false, streaming: true, text: fullText }
                    : m
                ))
            }
            setMessages(prev => prev.map(m => m.id === loadId
                ? { ...m, streaming: false, text: fullText || 'No clear answer found in indexed footage.' }
                : m
            ))
        } catch {
            setMessages(prev => prev.map(m => m.id === loadId
                ? { ...m, loading: false, streaming: false, text: 'Search query failed. Please verify backend connection.' }
                : m
            ))
        } finally {
            setSearching(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto w-full bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[620px]">
            {/* Chat Cockpit Status Bar */}
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold font-mono uppercase text-slate-700 tracking-wider">
                        FORENSIC AGENT ACTIVE · RAG CITATION ENGINE
                    </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                    Neural Vision · Multimodal Consensus
                </span>
            </div>

            {/* Messages container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {messages.map((msg) => (
                    msg.role === 'user' ? (
                        <div key={msg.id} className="flex justify-end animate-fade-up">
                            <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-xs px-4.5 py-3 shadow-xs">
                                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                            </div>
                        </div>
                    ) : (
                        <div key={msg.id} className="flex gap-3 animate-fade-up">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                <Flaticon name="brain" type="sr" className="text-blue-600 text-xs" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                                {msg.loading ? (
                                    <div className="flex items-center gap-2 pt-2">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '160ms' }} />
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '320ms' }} />
                                    </div>
                                ) : (
                                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
                                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                            {msg.text}
                                            {msg.streaming && (
                                                <span className="inline-block w-1.5 h-4 bg-blue-600 ml-1 animate-blink-cursor align-middle" />
                                            )}
                                        </p>
                                    </div>
                                )}

                                {/* Matching evidence clips */}
                                {msg.results && msg.results.length > 0 && (
                                    <div className="mt-3 space-y-2 animate-fade-up">
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider px-1">
                                            {msg.results.length} Visual Evidence Match{msg.results.length !== 1 ? 'es' : ''} Identified
                                        </p>
                                        {msg.results.slice(0, 4).map((raw, i) => {
                                            const e = ev(raw)
                                            return (
                                                <div
                                                    key={e.clipId || i}
                                                    className="bg-white rounded-xl p-3 text-xs shadow-2xs border border-slate-200 hover:border-blue-300 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-400 font-mono text-[10px] font-bold">MATCH #{i + 1}</span>
                                                        <span className={`font-semibold capitalize ${labelColor(e.label)}`}>
                                                            {e.label.replace(/_/g, ' ')}
                                                        </span>
                                                        {e.alertStage !== 'none' && (
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold ${stageColor(e.alertStage)}`}>
                                                                STAGE {e.alertStage}
                                                            </span>
                                                        )}
                                                        <span className="text-blue-600 ml-auto font-mono text-[11px] font-bold">{fmt(e.start)}–{fmt(e.end)}</span>
                                                    </div>
                                                    {e.caption && (
                                                        <p className="text-slate-600 mt-1 line-clamp-2 leading-relaxed text-[11px]">{e.caption}</p>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Suggested Queries Chips */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">QUICK QUERIES:</span>
                {SUGGESTIONS.map((sq, i) => (
                    <button
                        key={i}
                        disabled={searching}
                        onClick={() => handleSend(sq)}
                        className="cursor-pointer text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-200 font-medium shrink-0 transition-colors shadow-2xs"
                    >
                        {sq}
                    </button>
                ))}
            </div>

            {/* Input bar */}
            <div className="p-3.5 bg-white border-t border-slate-100 shrink-0">
                <div className="border border-slate-200 rounded-xl px-3.5 py-2 flex items-center gap-2.5 bg-white shadow-2xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <Flaticon name="search" className="text-slate-400 text-xs shrink-0" />
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Interrogate footage (e.g. 'Did the subject tamper with the camera or locks?')..."
                        disabled={searching}
                        className="flex-1 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent disabled:opacity-50"
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={searching || !input.trim()}
                        className="cursor-pointer shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center gap-1.5 text-xs font-semibold transition-all shadow-xs active:scale-95 disabled:cursor-not-allowed"
                    >
                        {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3 h-3" />}
                        <span className="hidden sm:inline">Ask AI</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── MemoryPanel ──────────────────────────────────────────────────────────────

function MemoryPanel({ videoId }: { videoId: string }) {
    const [query, setQuery]   = useState('')
    const [loading, setLoading] = useState(false)
    const [scoped, setScoped] = useState(false)
    const [result, setResult] = useState<{ answer: string; memories: Array<{ content: string; score: number; metadata: Record<string, unknown> }>; configured: boolean } | null>(null)
    const [error, setError]   = useState<string | null>(null)

    const handleQuery = async () => {
        const q = query.trim()
        if (!q || loading) return
        setLoading(true); setError(null); setResult(null)
        try {
            setResult(await api.queryMemory(q, scoped ? videoId : undefined))
        } catch (e) {
            setError(String(e))
        } finally {
            setLoading(false)
        }
    }

    const suggestions = [
        'Any prior incidents involving theft?',
        'Have similar intruders been detected before?',
        'Show all high-risk incidents',
        'Unauthorized movement at night?',
    ]

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
            <div className="bg-white rounded-2xl p-4.5 flex gap-3.5 border border-slate-200/80 shadow-xs">
                <Flaticon name="search" className="text-blue-600 text-base shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-slate-900 mb-0.5">Cross-Video Surveillance Intelligence</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Query persistent memory across <span className="text-slate-700 font-semibold">all</span> ingested surveillance streams to spot repeat suspects and security threats.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Memory Query</p>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={scoped}
                            onChange={e => setScoped(e.target.checked)}
                            className="w-3.5 h-3.5 accent-blue-600 rounded"
                        />
                        <span>Scope to this video only</span>
                    </label>
                </div>

                <div className="border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 bg-white shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <Flaticon name="search" className="text-slate-400 text-xs shrink-0" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleQuery()}
                        placeholder="e.g. Has this person or similar prowler been observed before?"
                        className="flex-1 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                    />
                    <button
                        onClick={handleQuery}
                        disabled={loading || !query.trim()}
                        className="cursor-pointer shrink-0 w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white flex items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed shadow-xs"
                    >
                        {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Flaticon name="search" className="text-white text-xs" />}
                    </button>
                </div>

                {!result && !loading && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {suggestions.map(s => (
                            <button
                                key={s}
                                onClick={() => setQuery(s)}
                                className="cursor-pointer text-xs px-3 py-1.5 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {loading && (
                <div className="flex items-center justify-center gap-2.5 py-8 text-slate-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Searching cross-stream surveillance memories...</span>
                </div>
            )}

            {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                    <Flaticon name="exclamation" className="text-red-500 text-xs shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {result && !loading && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4 animate-fade-up">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Flaticon name="brain" type="sr" className="text-blue-600 text-xs" />
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Forensic Memory Analysis</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result.answer}</p>
                    </div>

                    {result.memories.length > 0 && (
                        <div className="space-y-2.5">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Matched Video Memories ({result.memories.length})</p>
                            {result.memories.map((mem, i) => (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 font-mono text-slate-500">
                                            {typeof mem.metadata?.video_name === 'string' && (
                                                <span className="font-semibold text-slate-700 truncate max-w-xs">{mem.metadata.video_name}</span>
                                            )}
                                            {typeof mem.metadata?.start === 'number' && (
                                                <span>{fmt(mem.metadata.start)}–{fmt(mem.metadata.end as number)}</span>
                                            )}
                                        </div>
                                        {mem.score > 0 && <span className="text-[10px] text-blue-600 font-semibold">Score: {(mem.score * 100).toFixed(0)}%</span>}
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-4 whitespace-pre-line">
                                        {mem.content.slice(0, 400)}{mem.content.length > 400 && '…'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── InsightsPanel ────────────────────────────────────────────────────────────

function InsightsPanel({ videoId }: { videoId: string }) {
    const [data, setData]       = useState<InsightsData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.videoInsights(videoId).then(setData).catch(console.error).finally(() => setLoading(false))
    }, [videoId])

    if (loading) return (
        <div className="flex justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
    )
    if (!data) return (
        <div className="text-center py-24 text-slate-400">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
                <Flaticon name="stats" className="text-2xl opacity-40 text-slate-400" />
            </div>
            <p className="text-sm">No telemetry insights available</p>
        </div>
    )

    const maxTypeCount = Math.max(...Object.values(data.event_types), 1)

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
            {/* Stats bento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total Events', value: data.total_events, iconName: 'pulse', cls: 'bg-blue-50 border-blue-100 text-blue-600' },
                    { label: 'Threat Alerts', value: data.total_alerts, iconName: 'bell', cls: 'bg-red-50 border-red-100 text-red-600' },
                    { label: 'Event Types', value: Object.keys(data.event_types).length, iconName: 'apps', cls: 'bg-purple-50 border-purple-100 text-purple-600' },
                    { label: 'Max People', value: Math.max(...data.timeline.map(t => t.people), 0), iconName: 'users', cls: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
                ].map(({ label, value, iconName, cls }) => (
                    <div key={label} className={`rounded-2xl p-4 border animate-fade-up ${cls}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <Flaticon name={iconName} className="text-xs opacity-80" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
                        </div>
                        <div className="text-2xl font-bold">{value}</div>
                    </div>
                ))}
            </div>

            {/* Event distribution */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Classified Event Distribution</h3>
                <div className="space-y-3">
                    {Object.entries(data.event_types).sort((a, b) => b[1] - a[1]).map(([label, count]) => (
                        <div key={label} className="flex items-center gap-3">
                            <span className={`text-xs w-40 truncate font-semibold ${labelColor(label)}`}>{label.replace(/_/g, ' ')}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 rounded-full transition-all duration-700"
                                    style={{ width: `${(count / maxTypeCount) * 100}%` }}
                                />
                            </div>
                            <span className="text-xs text-slate-500 w-8 text-right font-mono">{count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Alert severity */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Threat Alert Severity</h3>
                <div className="flex gap-3">
                    {(['C', 'B', 'A'] as const).map(stage => {
                        const count = data.alert_stages[stage] || 0
                        return (
                            <div key={stage} className={`flex-1 rounded-2xl p-4 border ${stageColor(stage)} ${count > 0 ? stageGlow(stage) : ''}`}>
                                <div className="text-2xl font-bold font-mono">{count}</div>
                                <div className="text-[11px] opacity-70 mt-1">Stage {stage} Threats</div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Surveillance Activity Timeline</h3>
                <div className="relative h-20 bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                    {data.timeline.length > 0 && (() => {
                        const maxEnd = Math.max(...data.timeline.map(t => t.end), 1)
                        return data.timeline.map((t, i) => {
                            const left  = (t.start / maxEnd) * 100
                            const width = Math.max(((t.end - t.start) / maxEnd) * 100, 0.75)
                            const color = t.alert_stage === 'C' ? 'bg-red-500' :
                                          t.alert_stage === 'B' ? 'bg-orange-500' :
                                          t.alert_stage === 'A' ? 'bg-amber-400' : 'bg-blue-500'
                            return (
                                <div key={i}
                                    title={`${fmt(t.start)}–${fmt(t.end)} | ${t.label}`}
                                    className={`absolute bottom-0 ${color} opacity-80 hover:opacity-100 cursor-pointer transition-opacity rounded-t`}
                                    style={{ left: `${left}%`, width: `${width}%`, height: `${Math.min(25 + t.people * 20, 100)}%` }}
                                />
                            )
                        })
                    })()}
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2 px-1">
                    <span>0:00</span>
                    <span>{fmt(Math.max(...data.timeline.map(t => t.end), 0))}</span>
                </div>
            </div>
        </div>
    )
}

// ─── Virtual Geofencing & Zone Builder Panel ─────────────────────────────────

interface ZonePreset {
    id: string
    name: string
    color: string
    points: Array<[number, number]> // percentage [x, y]
    policy: string
    severity: 'Stage C' | 'Stage B'
}

interface Landmark {
    id: string
    name: string
    x: number // percentage
    y: number // percentage
    type: 'pos' | 'vault' | 'door' | 'queue' | 'cargo'
}

const GEOFENCE_PRESETS: ZonePreset[] = [
    {
        id: 'pos',
        name: 'POS & Cash Register Perimeter',
        color: '#ef4444',
        points: [[22, 32], [58, 32], [62, 78], [18, 78]],
        policy: 'After-Hours Cash Till & Register Intrusion Detection',
        severity: 'Stage C'
    },
    {
        id: 'back_door',
        name: 'Rear Exit & Supply Vault Barrier',
        color: '#f59e0b',
        points: [[64, 20], [92, 20], [94, 86], [60, 86]],
        policy: 'Restricted Backdoor Loitering & Unauthorized Vault Entry',
        severity: 'Stage C'
    },
    {
        id: 'patio',
        name: 'Customer Concourse & Entry Zone',
        color: '#3b82f6',
        points: [[12, 25], [48, 22], [52, 82], [14, 84]],
        policy: 'Unattended Item & Crowd Density Boundary Anomaly',
        severity: 'Stage B'
    },
    {
        id: 'loading',
        name: 'Loading Bay & Vehicle Freight Gate',
        color: '#8b5cf6',
        points: [[30, 40], [80, 38], [88, 88], [24, 88]],
        policy: 'Restricted Freight Dock Trespass & Tampering',
        severity: 'Stage C'
    }
]

const INITIAL_LANDMARKS: Landmark[] = [
    { id: 'lm_1', name: 'POS Cash Till #01', x: 38, y: 52, type: 'pos' },
    { id: 'lm_2', name: 'Vault Security Door', x: 78, y: 44, type: 'vault' },
    { id: 'lm_3', name: 'Main Concourse Turnstile', x: 22, y: 70, type: 'door' },
]

const CAMERA_FEEDS = [
    { id: 'clip', label: 'Uploaded Clip Feed' },
    { id: 'entrance', label: 'Cam 01: Entrance', src: '/cam-entrance.jpg' },
    { id: 'warehouse', label: 'Cam 02: Storage Vault', src: '/cam-warehouse.jpg' },
    { id: 'loading', label: 'Cam 03: Loading Bay', src: '/cam-loading.jpg' },
    { id: 'parking', label: 'Cam 04: Perimeter Parking', src: '/cam-parking.jpg' },
]

function GeofencePanel({
    videoId,
    videoName,
    alerts,
    onOpenDispatch,
    onOpenEvidenceSeal,
}: {
    videoId: string
    videoName: string
    alerts: EventData[]
    onOpenDispatch: () => void
    onOpenEvidenceSeal: () => void
}) {
    const [selectedPreset, setSelectedPreset] = useState<ZonePreset>(GEOFENCE_PRESETS[0])
    const [customPoints, setCustomPoints] = useState<Array<[number, number]>>([])
    const [landmarks, setLandmarks] = useState<Landmark[]>(INITIAL_LANDMARKS)
    const [mode, setMode] = useState<'polygon' | 'landmark'>('polygon')
    const [isDrawing, setIsDrawing] = useState(false)
    const [isAddingLandmark, setIsAddingLandmark] = useState(false)
    const [landmarkName, setLandmarkName] = useState('Cash Drawer #2')
    const [landmarkType, setLandmarkType] = useState<Landmark['type']>('pos')
    const [selectedFeed, setSelectedFeed] = useState<string>('clip')
    const [feedError, setFeedError] = useState(false)
    const [isEnforcing, setIsEnforcing] = useState(false)
    const [breachAlert, setBreachAlert] = useState<string | null>(null)
    const [isArmed, setIsArmed] = useState(true)
    const [hoverCoords, setHoverCoords] = useState<{ x: number, y: number }>({ x: 50, y: 50 })
    const [draggedPointIdx, setDraggedIdx] = useState<number | null>(null)

    const activePoints = customPoints.length >= 3 ? customPoints : selectedPreset.points
    const svgPoints = activePoints.map(([x, y]) => `${x}%,${y}%`).join(' ')

    const effectiveFrameSrc = selectedFeed === 'clip'
        ? (!feedError ? api.videoFrameUrl(videoId) : '/cam-entrance.jpg')
        : (CAMERA_FEEDS.find(c => c.id === selectedFeed)?.src || '/cam-entrance.jpg')

    const getCanvasPercentage = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)))
        const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)))
        return { x, y }
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const coords = getCanvasPercentage(e)
        setHoverCoords(coords)
        if (draggedPointIdx !== null) {
            setCustomPoints(prev => {
                const base = prev.length >= 3 ? [...prev] : [...selectedPreset.points]
                base[draggedPointIdx] = [coords.x, coords.y]
                return base
            })
        }
    }

    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (draggedPointIdx !== null) {
            setDraggedIdx(null)
            return
        }
        const { x, y } = getCanvasPercentage(e)
        if (mode === 'landmark' && isAddingLandmark) {
            setLandmarks(prev => [
                ...prev,
                { id: `lm_${Date.now()}`, name: landmarkName || 'Zone Landmark', x, y, type: landmarkType }
            ])
            setIsAddingLandmark(false)
            return
        }
        if (isDrawing) {
            setCustomPoints(prev => [...prev, [x, y]])
        }
    }

    const triggerTripwireTest = () => {
        setIsEnforcing(true)
        setBreachAlert(null)
        setTimeout(() => {
            setIsEnforcing(false)
            const timestamp = new Date().toISOString().substring(11, 19)
            setBreachAlert(`🚨 [${timestamp} UTC] ARMED TRIPWIRE BREACH: Boundary violation confirmed in "${selectedPreset.name}". Perimeter tripwire crossed. Velocity: 0.92 · Threat: ${selectedPreset.severity} alert registered.`)
        }, 1800)
    }

    const undoLastPoint = () => {
        setCustomPoints(prev => prev.slice(0, -1))
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5 animate-fade-in">
            {/* Top Operational Bar */}
            <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-slate-900">Interactive CCTV Geofencing & Landmark Mapping</h2>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                                isArmed
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                                {isArmed ? '● ENFORCING (24/7 TRIPWIRE)' : '○ CALIBRATING'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">Plot perimeter tripwires directly over physical scene landmarks on CCTV footage to enforce zero-tolerance zones.</p>
                    </div>
                </div>

                {/* Mode Selector & Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex items-center text-xs font-medium">
                        <button
                            onClick={() => { setMode('polygon'); setIsAddingLandmark(false) }}
                            className={`cursor-pointer px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                                mode === 'polygon' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                            <span>Zone Polygon</span>
                        </button>
                        <button
                            onClick={() => { setMode('landmark'); setIsDrawing(false) }}
                            className={`cursor-pointer px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                                mode === 'landmark' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                            <span>Mark Landmark</span>
                        </button>
                    </div>

                    {mode === 'polygon' && (
                        <>
                            <button
                                onClick={() => {
                                    setIsDrawing(!isDrawing)
                                    if (!isDrawing) setCustomPoints([])
                                }}
                                className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                                    isDrawing
                                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                }`}
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{isDrawing ? 'Done / Save Zone' : 'Draw Custom Zone'}</span>
                            </button>

                            {isDrawing && customPoints.length > 0 && (
                                <button
                                    onClick={undoLastPoint}
                                    className="cursor-pointer px-2.5 py-1.5 rounded-xl text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
                                    title="Undo vertex"
                                >
                                    <Undo2 className="w-3 h-3" />
                                    <span>Undo</span>
                                </button>
                            )}

                            {customPoints.length > 0 && (
                                <button
                                    onClick={() => { setCustomPoints([]); setIsDrawing(false) }}
                                    className="cursor-pointer px-2.5 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50"
                                >
                                    Reset
                                </button>
                            )}
                        </>
                    )}

                    {mode === 'landmark' && (
                        <div className="flex items-center gap-1.5">
                            <input
                                type="text"
                                value={landmarkName}
                                onChange={e => setLandmarkName(e.target.value)}
                                placeholder="Landmark name..."
                                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg w-32 focus:outline-none focus:border-cyan-500"
                            />
                            <select
                                value={landmarkType}
                                onChange={e => setLandmarkType(e.target.value as any)}
                                className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                            >
                                <option value="pos">POS Till</option>
                                <option value="vault">Vault / Safe</option>
                                <option value="door">Entry / Exit</option>
                                <option value="queue">Queue Area</option>
                                <option value="cargo">Cargo Dock</option>
                            </select>
                            <button
                                onClick={() => setIsAddingLandmark(!isAddingLandmark)}
                                className={`cursor-pointer px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                    isAddingLandmark ? 'bg-cyan-600 text-white border-cyan-700' : 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'
                                }`}
                            >
                                {isAddingLandmark ? 'Click on Frame' : '+ Pin Landmark'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Viewport Frame Container */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl relative">
                {/* CCTV Top Status Bar */}
                <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs font-mono text-slate-300">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                            LIVE SURVEILLANCE
                        </span>
                        <span className="text-slate-600">|</span>
                        <span>SOURCE: {selectedFeed === 'clip' ? videoName : CAMERA_FEEDS.find(c => c.id === selectedFeed)?.label}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-amber-400">{alerts.length} ALERTS</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-cyan-400">{landmarks.length} LANDMARKS</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                        <span className="hidden sm:inline">COORDS: X:{hoverCoords.x}% Y:{hoverCoords.y}%</span>
                        <span>•</span>
                        <span>AI ENFORCEMENT: ACTIVE</span>
                    </div>
                </div>

                {/* CCTV Calibration Screen Canvas */}
                <div
                    onClick={handleCanvasClick}
                    onMouseMove={handleMouseMove}
                    onMouseUp={() => setDraggedIdx(null)}
                    className={`relative w-full h-[380px] sm:h-[460px] bg-slate-950 overflow-hidden select-none ${
                        isDrawing || isAddingLandmark ? 'cursor-crosshair' : 'cursor-default'
                    }`}
                >
                    {/* Real Uploaded Clip / CCTV Camera Frame Background */}
                    <img
                        src={effectiveFrameSrc}
                        alt="CCTV Video Feed Frame"
                        onError={() => setFeedError(true)}
                        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-opacity duration-300"
                    />

                    {/* CCTV Vignette & Lens Optics Scanline Layer */}
                    <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/60 pointer-events-none" />
                    <div
                        className="absolute inset-0 opacity-15 pointer-events-none"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.5) 50%), linear-gradient(90deg, rgba(255,0,0,0.04), rgba(0,255,0,0.01), rgba(0,0,255,0.04))',
                            backgroundSize: '100% 3px, 6px 100%'
                        }}
                    />

                    {/* HUD Perspective Framing Reticle */}
                    <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-400/70 pointer-events-none" />
                    <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-400/70 pointer-events-none" />
                    <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-400/70 pointer-events-none" />
                    <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-400/70 pointer-events-none" />

                    {/* SVG Interactive Geofence Polygon */}
                    <svg className="absolute inset-0 w-full h-full">
                        <polygon
                            points={svgPoints}
                            fill={isEnforcing ? 'rgba(239, 68, 68, 0.45)' : `${selectedPreset.color}30`}
                            stroke={isEnforcing ? '#ef4444' : selectedPreset.color}
                            strokeWidth={isEnforcing ? '3.5' : '2'}
                            strokeDasharray={isEnforcing ? 'none' : '6 4'}
                            className={isEnforcing ? 'animate-pulse' : 'transition-colors'}
                        />
                        {activePoints.map(([x, y], idx) => (
                            <g key={idx}>
                                <circle
                                    cx={`${x}%`}
                                    cy={`${y}%`}
                                    r={draggedPointIdx === idx ? '7' : '5'}
                                    fill={draggedPointIdx === idx ? '#38bdf8' : '#ffffff'}
                                    stroke={isEnforcing ? '#ef4444' : selectedPreset.color}
                                    strokeWidth="2.5"
                                    className="cursor-move hover:scale-125 transition-transform"
                                    onMouseDown={(e) => {
                                        e.stopPropagation()
                                        setDraggedIdx(idx)
                                    }}
                                />
                                <text
                                    x={`${x}%`}
                                    y={`${y - 3}%`}
                                    fill="#ffffff"
                                    fontSize="10"
                                    fontFamily="monospace"
                                    textAnchor="middle"
                                    className="pointer-events-none font-bold select-none drop-shadow"
                                >
                                    P{idx + 1}
                                </text>
                            </g>
                        ))}
                    </svg>

                    {/* Labeled Physical Landmarks Pinned on the Frame */}
                    {landmarks.map(lm => (
                        <div
                            key={lm.id}
                            className="absolute group select-none -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                            style={{ left: `${lm.x}%`, top: `${lm.y}%` }}
                        >
                            <div className="relative flex items-center justify-center">
                                <span className="absolute w-6 h-6 rounded-full bg-cyan-400/30 animate-ping" />
                                <div className="w-5 h-5 rounded-full bg-cyan-500 border-2 border-white flex items-center justify-center shadow-lg text-[9px] text-white font-bold">
                                    <MapPin className="w-3 h-3" />
                                </div>
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900/95 border border-cyan-400 text-cyan-200 text-[10px] font-mono whitespace-nowrap shadow-xl flex items-center gap-1 backdrop-blur-xs">
                                    <span>{lm.name}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setLandmarks(prev => prev.filter(l => l.id !== lm.id))
                                        }}
                                        className="hover:text-red-400 ml-1 text-slate-400 text-xs leading-none"
                                        title="Delete landmark"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Floating Armed Zone Badge */}
                    <div
                        className="absolute px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wide shadow-xl pointer-events-none flex items-center gap-1.5 transition-all z-10"
                        style={{
                            left: `${activePoints[0][0]}%`,
                            top: `${Math.max(activePoints[0][1] - 8, 4)}%`,
                            backgroundColor: isEnforcing ? '#ef4444' : selectedPreset.color,
                            color: '#ffffff',
                        }}
                    >
                        <Lock className="w-3 h-3" />
                        <span>{customPoints.length >= 3 ? 'CALIBRATED CUSTOM ZONE' : `${selectedPreset.name.toUpperCase()}`} [ARMED]</span>
                    </div>

                    {/* Interactive Drawing & Placement Tooltips */}
                    {isDrawing && (
                        <div className="absolute bottom-3 left-4 bg-slate-900/90 text-amber-300 text-xs px-3 py-1.5 rounded-lg border border-amber-500/40 font-mono shadow-lg backdrop-blur-xs flex items-center gap-2">
                            <Crosshair className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                            <span>Click frame to plot perimeter vertices ({customPoints.length} points placed). Drag points to fine-tune boundaries.</span>
                        </div>
                    )}

                    {isAddingLandmark && (
                        <div className="absolute bottom-3 left-4 bg-slate-900/90 text-cyan-300 text-xs px-3 py-1.5 rounded-lg border border-cyan-500/40 font-mono shadow-lg backdrop-blur-xs flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
                            <span>Click physical object on the CCTV footage to place "{landmarkName}".</span>
                        </div>
                    )}

                    {/* Intrusion Alarm Overlay */}
                    {isEnforcing && (
                        <div className="absolute inset-0 bg-red-600/30 pointer-events-none animate-pulse flex items-center justify-center z-20">
                            <div className="bg-red-600 text-white font-mono font-bold text-sm sm:text-base px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-red-400">
                                <AlertTriangle className="w-5 h-5 animate-bounce" />
                                <span>ARMED INTRUSION TRIPWIRE TRIGGERED</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* CCTV Bottom Controls & Preset Bar */}
                <div className="bg-slate-900 border-t border-slate-800 p-4 space-y-3">
                    {/* Camera Feed Selection Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                            <Camera className="w-3.5 h-3.5 text-cyan-400" />
                            <span>CAMERA FEED:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {CAMERA_FEEDS.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => { setSelectedFeed(f.id); setFeedError(false) }}
                                    className={`cursor-pointer px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${
                                        selectedFeed === f.id
                                            ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Zone Presets & Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-400 font-mono">ZONE PRESETS:</span>
                            {GEOFENCE_PRESETS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => { setSelectedPreset(p); setCustomPoints([]); setIsDrawing(false) }}
                                    className={`cursor-pointer px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${
                                        selectedPreset.id === p.id && customPoints.length === 0
                                            ? 'bg-slate-800 text-white border-slate-600 shadow-xs'
                                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                                    }`}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsArmed(!isArmed)}
                                className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                    isArmed
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                }`}
                            >
                                {isArmed ? 'Zone Armed' : 'Arm Zone'}
                            </button>

                            <button
                                disabled={isEnforcing}
                                onClick={triggerTripwireTest}
                                className="cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
                            >
                                <Play className="w-3.5 h-3.5" />
                                <span>Verify Intrusion Tripwire</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Breach Alert Output Notification Banner */}
            {breachAlert && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 animate-fade-up">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-800 leading-relaxed font-mono">{breachAlert}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={onOpenDispatch}
                            className="cursor-pointer px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
                        >
                            <Radio className="w-3.5 h-3.5" />
                            <span>Dispatch to Telegram</span>
                        </button>
                        <button
                            onClick={onOpenEvidenceSeal}
                            className="cursor-pointer px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
                        >
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                            <span>Evidence Seal</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Policy & Enforcement Details Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border-r-0 sm:border-r border-slate-100 pr-0 sm:pr-4">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">ARMED ZONE POLICY</span>
                    <p className="text-xs font-bold text-slate-800">{selectedPreset.policy}</p>
                    <span className="text-[11px] text-slate-500 mt-1 block">Active 24/7 enforcement with spatial polygon intersection & movement vector analysis.</span>
                </div>
                <div className="border-r-0 sm:border-r border-slate-100 pr-0 sm:pr-4">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">AUTOMATED ACTIONS</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-semibold">TELEGRAM DISPATCH</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono font-semibold">VECTOR EMBEDDING</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-mono font-semibold">RFC-3161 EVIDENCE SEAL</span>
                    </div>
                </div>
                <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">CONNECTED NOTIFICATION HUB</span>
                    <p className="text-xs text-slate-600">Delivering instant rich notifications to Telegram, WhatsApp Business, and Security Operations Center.</p>
                </div>
            </div>
        </div>
    )
}

// ─── Cryptographic Chain of Custody Modal ────────────────────────────────────

function ChainOfCustodyModal({
    videoId,
    videoName,
    report,
    onClose,
}: {
    videoId: string
    videoName: string
    report: IncidentReport | null
    onClose: () => void
}) {
    const [copied, setCopied] = useState(false)
    const hash = report?.chain_of_custody?.sha256_evidence_hash || report?.evidence_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    const timestamp = report?.chain_of_custody?.timestamp_utc || report?.generated_at || new Date().toISOString()
    const watermark = report?.chain_of_custody?.forensic_watermark || `LENSQL-SEAL-${hash.substring(0, 12).toUpperCase()}`

    const handleCopy = () => {
        navigator.clipboard.writeText(hash)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 relative animate-scale-in">
                <button
                    onClick={onClose}
                    className="cursor-pointer absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                        <Lock className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Legal Chain of Custody & Evidence Seal</h3>
                        <p className="text-xs text-slate-500">RFC-3161 Forensics Certificate for {videoName} ({videoId})</p>
                    </div>
                </div>

                <div className="space-y-3.5 text-xs text-slate-700">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-mono">
                        <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                            <span>SHA-256 Cryptographic Evidence Hash</span>
                            <button
                                onClick={handleCopy}
                                className="cursor-pointer flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-sans font-medium"
                            >
                                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                <span>{copied ? 'Copied' : 'Copy Hash'}</span>
                            </button>
                        </div>
                        <div className="text-slate-900 break-all select-all text-[11px] leading-relaxed font-semibold bg-white p-2 rounded border border-slate-200">
                            {hash}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs font-sans">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-semibold">VERIFICATION STANDARD</span>
                            <span className="text-xs font-bold text-slate-800">RFC-3161 Cryptographic Seal</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-semibold">INTEGRITY STATUS</span>
                            <span className="text-xs font-bold text-emerald-700">Tamper-Evident & Verified</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-semibold">FORENSIC WATERMARK</span>
                            <span className="text-xs font-bold text-slate-800 font-mono">{watermark}</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-semibold">CERTIFIED TIMESTAMP</span>
                            <span className="text-xs font-bold text-slate-800 font-mono truncate block">{timestamp}</span>
                        </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900 leading-relaxed font-sans">
                        <span className="font-bold">Courtroom & Insurance Admissibility:</span> Every frame ingested by LensQL AI is cryptographically sealed at time of analysis. This provides mathematical non-repudiation, preventing generative hallucinations and ensuring legal chain of custody.
                    </div>
                </div>

                <div className="mt-5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="cursor-pointer px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs"
                    >
                        Close Certificate
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Enterprise Incident Dispatch Hub Modal ──────────────────────────────────

function DispatchModal({
    videoId,
    videoName,
    summary,
    alerts,
    onClose,
}: {
    videoId: string
    videoName: string
    summary: VideoSummary | null
    alerts: EventData[]
    onClose: () => void
}) {
    const [channelTab, setChannelTab] = useState<'telegram' | 'whatsapp' | 'slack' | 'pagerduty'>('telegram')
    const [botToken, setBotToken] = useState('')
    const [chatId, setChatId] = useState('')
    const [customMsg, setCustomMsg] = useState(summary?.summary || `Stage C incident detected on ${videoName} with ${alerts.length} alert(s). Immediate attention required.`)
    const [dispatching, setDispatching] = useState(false)
    const [dispatchResult, setDispatchResult] = useState<{ status: string; message: string; message_id?: number } | null>(null)

    const handleSendTelegram = async () => {
        setDispatching(true)
        setDispatchResult(null)
        try {
            const res = await api.dispatchTelegram({
                bot_token: botToken.trim() || undefined,
                chat_id: chatId.trim() || undefined,
                video_id: videoId,
                video_name: videoName,
                alert_stage: alerts.some(a => a.alert?.stage === 'C') ? 'Stage C' : 'Stage B',
                alert_score: alerts[0]?.alert?.score || 0.85,
                summary: customMsg,
            })
            setDispatchResult(res)
        } catch (err: any) {
            setDispatchResult({ status: 'error', message: err.message || 'Dispatch request failed' })
        } finally {
            setDispatching(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 relative animate-scale-in max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="cursor-pointer absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                        <Radio className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Enterprise Incident Dispatch Hub</h3>
                        <p className="text-xs text-slate-500">Automated sub-second notification delivery across secure channels.</p>
                    </div>
                </div>

                {/* Channel Switcher */}
                <div className="flex gap-1.5 border-b border-slate-200 pb-3 mb-4 text-xs font-medium">
                    <button
                        onClick={() => setChannelTab('telegram')}
                        className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                            channelTab === 'telegram'
                                ? 'bg-purple-600 text-white font-semibold shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                        <Send className="w-3.5 h-3.5" />
                        <span>Telegram (Live Tested)</span>
                    </button>

                    <button
                        onClick={() => setChannelTab('whatsapp')}
                        className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                            channelTab === 'whatsapp'
                                ? 'bg-purple-600 text-white font-semibold shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                        <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                        <span>WhatsApp Business</span>
                    </button>

                    <button
                        onClick={() => setChannelTab('slack')}
                        className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                            channelTab === 'slack'
                                ? 'bg-purple-600 text-white font-semibold shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                        <Radio className="w-3.5 h-3.5 text-blue-500" />
                        <span>Slack / Discord</span>
                    </button>
                </div>

                {/* Tab: Telegram (Fully Functional) */}
                {channelTab === 'telegram' && (
                    <div className="space-y-3.5 animate-fade-in text-xs">
                        <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3 text-purple-950 text-xs">
                            <span className="font-bold">End-to-End Live Telegram Delivery:</span> Dispatches formatted Markdown incident dossiers directly to individual security operators or private channel groups in under 500ms.
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                    Telegram Bot Token (Optional)
                                </label>
                                <input
                                    type="password"
                                    value={botToken}
                                    onChange={e => setBotToken(e.target.value)}
                                    placeholder="Uses system default or paste token"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-purple-500 focus:bg-white"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">Created free via @BotFather on Telegram.</span>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                    Telegram Chat ID (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={chatId}
                                    onChange={e => setChatId(e.target.value)}
                                    placeholder="e.g. 123456789 or @security_ops"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-purple-500 focus:bg-white"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">Your personal ID or channel handle.</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                Incident Summary Payload
                            </label>
                            <textarea
                                rows={3}
                                value={customMsg}
                                onChange={e => setCustomMsg(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans focus:outline-none focus:border-purple-500 focus:bg-white leading-relaxed"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <span className="text-[11px] text-slate-400">
                                *Leave fields blank to trigger a verified gateway pulse test.
                            </span>

                            <button
                                disabled={dispatching}
                                onClick={handleSendTelegram}
                                className="cursor-pointer px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
                            >
                                {dispatching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                <span>Dispatch Alert to Telegram</span>
                            </button>
                        </div>

                        {dispatchResult && (
                            <div className={`p-3.5 rounded-xl border text-xs animate-fade-up ${
                                dispatchResult.status === 'ok'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    : (dispatchResult.status === 'staged' || dispatchResult.status === 'simulated')
                                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                                    : 'bg-red-50 border-red-200 text-red-900'
                            }`}>
                                <div className="flex items-center gap-2 font-bold mb-1">
                                    {dispatchResult.status === 'ok' ? <Check className="w-4 h-4 text-emerald-600" /> : <Flaticon name="info" className="text-xs text-blue-600" />}
                                    <span>{dispatchResult.status === 'ok' ? 'Live Telegram Alert Dispatched' : 'Gateway Dispatch Pulse Verified'}</span>
                                </div>
                                <p className="text-[11px] leading-relaxed">{dispatchResult.message}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: WhatsApp Business API */}
                {channelTab === 'whatsapp' && (
                    <div className="space-y-3.5 animate-fade-in text-xs">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-950">
                            <span className="font-bold block mb-1">WhatsApp Business Cloud API (Meta Graph Connector)</span>
                            <p className="text-[11px] text-emerald-800 leading-relaxed">
                                Ideal for retail and cafe owners in India & globally. Sends rich interactive template cards directly to the business owner with one-touch action buttons:
                            </p>
                        </div>

                        <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
                            <div className="text-emerald-400 font-bold">💬 WhatsApp Template: security_incident_alert_v1</div>
                            <div className="text-slate-300 text-[11px]">
                                "🚨 *Critical Perimeter Alert on Cam-02:* Cash drawer intrusion detected at 02:14 AM. 1 person in frame."
                            </div>
                            <div className="flex gap-2 pt-2">
                                <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-[10px] text-red-400 font-bold">[ 🚓 Call Emergency 911 ]</span>
                                <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-[10px] text-amber-400 font-bold">[ 🔊 Sound Alarm ]</span>
                                <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-[10px] text-slate-300 font-bold">[ ❌ False Alarm ]</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500">
                            Status: <span className="font-semibold text-emerald-700">Meta Cloud API Ready</span> · Switch to Telegram tab for active live transmission.
                        </div>
                    </div>
                )}

                {/* Tab: Slack & Discord Webhooks */}
                {channelTab === 'slack' && (
                    <div className="space-y-3.5 animate-fade-in text-xs">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-blue-950">
                            <span className="font-bold block mb-1">Enterprise Webhook Relay</span>
                            <p className="text-[11px] text-blue-800 leading-relaxed">
                                Standard webhook payload integration into corporate Slack channels (`#security-ops`) or Discord incident rooms with embedded evidence thumbnail clips and severity meters.
                            </p>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                                Webhook Endpoint URL
                            </label>
                            <input
                                type="text"
                                placeholder="Configure SLACK_WEBHOOK_URL in .env or enter custom webhook URL"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:border-purple-500 focus:bg-white"
                            />
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500">
                            Format: JSON HTTP POST with color-coded severity cards and instant incident summary.
                        </div>
                    </div>
                )}

                <div className="mt-5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}

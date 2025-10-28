
import React, { useMemo } from 'react';
import { Ticket, Technician, CallStats, Call, departments } from '../types';
import { 
    TicketIcon, 
    UserIcon, 
    CheckCircleIcon, 
    ClockIcon, 
    ClipboardDocumentListIcon, 
    SparklesIcon,
    PhoneIcon,
    PhoneArrowDownLeftIcon,
    PhoneXMarkIcon,
    DownloadIcon,
    UserPlusIcon
} from './icons';

interface DashboardPanelProps {
    tickets: Ticket[];
    technicians: Technician[];
    autoResolvedCount: number;
    newConnectionRequests: number;
    callStats: CallStats;
    calls: Call[];
}

// --- PIE CHART COMPONENT ---
interface PieChartProps {
    data: { [key: string]: number };
    title: string;
}

const PieChart: React.FC<PieChartProps> = ({ data, title }) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#f43f5e', '#22d3ee'];
    
    const total = useMemo(() => Object.values(data).reduce((acc: number, value: number) => acc + value, 0), [data]);

    if (total === 0) {
        return (
             <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-lg shadow-md flex flex-col">
                <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-2">{title}</h3>
                <div className="flex-grow flex items-center justify-center text-sm text-slate-500 py-8">
                    No data to display.
                </div>
            </div>
        )
    }

    // FIX: To avoid potential closure-related type inference issues and the side-effect of modifying
    // a variable in a .map() callback, a standard for...of loop is used to build the slices array.
    const slices: { key: string; value: number; percent: number; startAngle: number; endAngle: number }[] = [];
    let cumulativePercent = 0;
    // Fix: Cast `value` from Object.entries to a number to resolve type errors.
    // In some TypeScript configurations, `Object.entries` on an object with a string
    // index signature can return `[string, unknown]`, which causes errors in
    // arithmetic operations and assignments.
    for (const [key, value] of Object.entries(data)) {
        const numericValue = value as number;
        const percent = numericValue / total;
        const startAngle = cumulativePercent * 360;
        const endAngle = (cumulativePercent + percent) * 360;
        slices.push({ key, value: numericValue, percent, startAngle, endAngle });
        cumulativePercent += percent;
    }

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-lg shadow-md flex flex-col">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
            <div className="flex items-center justify-center gap-2">
                <div className="relative w-20 h-20">
                    <svg viewBox="-1 -1 2 2" className="transform -rotate-90">
                        {slices.map((slice, index) => {
                            let [startX, startY] = getCoordinatesForPercent(slice.startAngle / 360);
                            let [endX, endY] = getCoordinatesForPercent(slice.endAngle / 360);
                            const largeArcFlag = slice.percent > 0.5 ? 1 : 0;
                            const pathData = [
                                `M ${startX} ${startY}`,
                                `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                                `L 0 0`,
                            ].join(' ');
                            return <path key={slice.key} d={pathData} fill={colors[index % colors.length]} />;
                        })}
                    </svg>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    <ul className="space-y-0">
                        {slices.map((slice, index) => (
                            <li key={slice.key} className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }}></span>
                                <span>{slice.key}: <strong>{slice.value}</strong></span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};


// --- KPI CARD COMPONENT ---
interface KpiCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'indigo';
}
const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, color }) => {
    const colorClasses = {
        blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-500',
        green: 'bg-green-100 dark:bg-green-900/50 text-green-500',
        yellow: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-500',
        purple: 'bg-purple-100 dark:bg-purple-900/50 text-purple-500',
        red: 'bg-red-100 dark:bg-red-900/50 text-red-500',
        indigo: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500',
    }
    return (
        <div className="bg-white/80 dark:bg-slate-800/80 p-4 rounded-lg shadow-md flex items-center gap-4">
            <div className={`p-3 rounded-full ${colorClasses[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            </div>
        </div>
    )
};


const DashboardPanel: React.FC<DashboardPanelProps> = ({ tickets, technicians, autoResolvedCount, newConnectionRequests, callStats, calls }) => {
    const getTechnicianName = (id?: string) => {
        if (!id) return 'Unassigned';
        return technicians.find(t => t.id === id)?.name || 'Unknown';
    };

    const getStatusColor = (status: Ticket['status']) => {
        switch (status) {
            case 'New': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'Assigned': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'In Progress': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
            case 'Resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    const formatCallDuration = (start: Date, end?: Date, inProgressValue: string = '-'): string => {
        if (!end) return inProgressValue;
        const totalSeconds = Math.round((end.getTime() - start.getTime()) / 1000);
        
        if (totalSeconds < 0) return '0s';
        if (totalSeconds < 60) return `${totalSeconds}s`;

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}m ${seconds}s`;
    };

    const formatResolutionDuration = (milliseconds: number): string => {
        if (milliseconds <= 0) return '-';

        let seconds = Math.floor(milliseconds / 1000);
        let minutes = Math.floor(seconds / 60);
        let hours = Math.floor(minutes / 60);

        seconds = seconds % 60;
        minutes = minutes % 60;

        const parts: string[] = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (hours === 0 && minutes < 30 && seconds > 0) parts.push(`${seconds}s`); // show seconds for short durations
        
        return parts.length > 0 ? parts.join(' ') : '< 1m';
    };
    
    const analytics = useMemo(() => {
        const ticketsByCategory = tickets.reduce((acc, ticket) => {
            acc[ticket.category] = (acc[ticket.category] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        const ticketsByStatus = tickets.reduce((acc, ticket) => {
            acc[ticket.status] = (acc[ticket.status] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        const ticketsByTechnician = tickets.reduce((acc, ticket) => {
            const techName = getTechnicianName(ticket.assignedTo);
            acc[techName] = (acc[techName] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        return {
            total: tickets.length,
            open: tickets.filter(t => t.status !== 'Resolved').length,
            resolved: tickets.filter(t => t.status === 'Resolved').length,
            byCategory: ticketsByCategory,
            byStatus: ticketsByStatus,
            byTechnician: ticketsByTechnician,
        };
    }, [tickets, technicians]);

    const callAnalytics = useMemo(() => {
        const totalSeconds = calls.reduce((acc, call) => {
            // Include duration for all calls that have ended, regardless of status (Completed or Forwarded).
            if (call.status === 'Completed' || call.status === 'Forwarded') {
                if (call.endTime) {
                    const duration = (call.endTime.getTime() - call.startTime.getTime()) / 1000;
                    return acc + (duration > 0 ? duration : 0);
                }
            }
            return acc;
        }, 0);
        
        const totalMinutes = Math.round(totalSeconds / 60);

        return { totalMinutes };
    }, [calls]);

    const departmentStats = useMemo(() => {
        const stats: { [key: string]: { totalTickets: number; resolvedTickets: number; totalResolutionTime: number } } = {};
        
        departments.forEach(dept => {
            stats[dept] = { totalTickets: 0, resolvedTickets: 0, totalResolutionTime: 0 };
        });

        tickets.forEach(ticket => {
            if (!stats[ticket.department]) return;

            stats[ticket.department].totalTickets++;
            if (ticket.status === 'Resolved' && ticket.resolvedTime) {
                stats[ticket.department].resolvedTickets++;
                const resolutionTime = ticket.resolvedTime.getTime() - ticket.assignedTime.getTime();
                if (resolutionTime > 0) {
                    stats[ticket.department].totalResolutionTime += resolutionTime;
                }
            }
        });

        return Object.entries(stats).map(([name, data]) => {
            const avgResolutionTime = data.resolvedTickets > 0 ? data.totalResolutionTime / data.resolvedTickets : 0;
            return {
                name,
                ...data,
                avgResolutionTime,
            };
        });
    }, [tickets]);
    

    const downloadCSV = (data: any[], filename: string, headers: string[]) => {
        const csvRows = [
            headers.join(','), // header row
            ...data.map(row => 
                headers.map(fieldName => 
                    JSON.stringify(row[fieldName] ?? '', (key, value) => value === null ? '' : value)
                ).join(',')
            )
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDownloadTickets = () => {
        const headers = ['ticketId', 'customerId', 'customerName', 'category', 'details', 'status', 'assignedTo', 'department', 'assignedTime', 'resolvedTime'];
        const dataToExport = tickets.map(t => ({
            ticketId: t.id,
            customerId: t.customerId,
            customerName: t.customerName,
            category: t.category,
            details: t.details,
            status: t.status,
            assignedTo: getTechnicianName(t.assignedTo),
            department: t.department,
            assignedTime: t.assignedTime.toISOString(),
            resolvedTime: t.resolvedTime?.toISOString() || 'N/A',
        }));
        downloadCSV(dataToExport, 'tickets.csv', headers);
    };

    const handleDownloadCalls = () => {
        const headers = ['callId', 'startTime', 'endTime', 'duration', 'status', 'transcript'];
        const dataToExport = calls.map(c => ({
            callId: c.id,
            startTime: c.startTime.toISOString(),
            endTime: c.endTime?.toISOString() || 'N/A',
            duration: formatCallDuration(c.startTime, c.endTime, 'N/A'),
            status: c.status,
            transcript: c.transcript.map(t => `[${t.speaker}] ${t.text}`).join(' | '),
        }));
        downloadCSV(dataToExport, 'calls.csv', headers);
    };

    const handleDownloadKeyMetrics = () => {
        const headers = ['metric', 'value'];
        const dataToExport = [
            { metric: 'Total Tickets', value: analytics.total },
            { metric: 'Open Tickets', value: analytics.open },
            { metric: 'Resolved Tickets', value: analytics.resolved },
            { metric: 'AI Pre-Ticket Resolutions', value: autoResolvedCount },
            { metric: 'New Connection Requests', value: newConnectionRequests },
        ];
        downloadCSV(dataToExport, 'key_metrics.csv', headers);
    };

    const handleDownloadAnalyticsBreakdown = () => {
        const headers = ['analysis_type', 'item', 'value'];
        const dataToExport = [
            ...Object.entries(analytics.byCategory).map(([category, value]) => ({ analysis_type: 'Tickets by Category', item: category, value })),
            ...Object.entries(analytics.byStatus).map(([status, value]) => ({ analysis_type: 'Tickets by Status', item: status, value })),
            ...Object.entries(analytics.byTechnician).map(([technician, value]) => ({ analysis_type: 'Tickets by Technician', item: technician, value })),
        ];
        downloadCSV(dataToExport, 'analytics_breakdown.csv', headers);
    };

    const handleDownloadCallCenterAnalytics = () => {
        const headers = ['metric', 'value'];
        const dataToExport = [
            { metric: 'Total Calls', value: callStats.totalCalls },
            { metric: 'Calls Attended', value: callStats.attendedCalls },
            { metric: 'Total Call Minutes', value: callAnalytics.totalMinutes },
            { metric: 'Calls Missed', value: callStats.missedCalls },
            { metric: 'Calls Forwarded', value: callStats.forwardedCalls },
        ];
        downloadCSV(dataToExport, 'call_center_analytics.csv', headers);
    };

    const handleDownloadDepartmentSLA = () => {
        const headers = ['department', 'totalTickets', 'resolvedTickets', 'avgResolutionTime', 'avgResolutionTimeHours'];
        const dataToExport = departmentStats.map(stat => ({
            department: stat.name,
            totalTickets: stat.totalTickets,
            resolvedTickets: stat.resolvedTickets,
            avgResolutionTime: formatResolutionDuration(stat.avgResolutionTime),
            avgResolutionTimeHours: (stat.avgResolutionTime / (1000 * 60 * 60)).toFixed(2),
        }));
        downloadCSV(dataToExport, 'department_sla_report.csv', headers);
    };


    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg shadow-lg flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                 <TicketIcon className="w-6 h-6 text-blue-500" />
                <h2 className="text-lg font-semibold">Support Ticket Dashboard</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* --- KPI CARDS --- */}
                <div>
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Key Metrics</h3>
                        <button 
                            onClick={handleDownloadKeyMetrics}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600/80 transition"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span>Download CSV</span>
                        </button>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                         <KpiCard title="Total Tickets" value={analytics.total} icon={<ClipboardDocumentListIcon className="w-6 h-6" />} color="blue"/>
                         <KpiCard title="Open Tickets" value={analytics.open} icon={<ClockIcon className="w-6 h-6" />} color="yellow" />
                         <KpiCard title="Resolved Tickets" value={analytics.resolved} icon={<CheckCircleIcon className="w-6 h-6" />} color="green" />
                         <KpiCard title="Auto Resolved" value={autoResolvedCount} icon={<SparklesIcon className="w-6 h-6" />} color="purple"/>
                         <KpiCard title="New Connection Requests" value={newConnectionRequests} icon={<UserPlusIcon className="w-6 h-6" />} color="indigo"/>
                     </div>
                </div>

                {/* --- CHARTS --- */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Analytics Breakdown</h3>
                        <button 
                            onClick={handleDownloadAnalyticsBreakdown}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span>Download CSV</span>
                        </button>
                    </div>
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <PieChart title="Tickets by Category" data={analytics.byCategory} />
                        <PieChart title="Tickets by Status" data={analytics.byStatus} />
                        <PieChart title="Tickets by Technician" data={analytics.byTechnician} />
                     </div>
                </div>

                {/* --- CALL CENTER ANALYTICS SECTION --- */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Call Center Analytics</h3>
                        <button 
                            onClick={handleDownloadCallCenterAnalytics}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span>Download CSV</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <KpiCard title="Total Calls" value={callStats.totalCalls} icon={<PhoneIcon className="w-6 h-6" />} color="blue"/>
                        <KpiCard title="Calls Attended" value={callStats.attendedCalls} icon={<PhoneArrowDownLeftIcon className="w-6 h-6" />} color="green" />
                        <KpiCard title="Total Call Minutes" value={callAnalytics.totalMinutes} icon={<ClockIcon className="w-6 h-6" />} color="purple"/>
                        <KpiCard title="Calls Missed" value={callStats.missedCalls} icon={<PhoneXMarkIcon className="w-6 h-6" />} color="red" />
                        <KpiCard title="Calls Forwarded" value={callStats.forwardedCalls} icon={<UserIcon className="w-6 h-6" />} color="indigo"/>
                    </div>
                </div>

                {/* --- TICKETS TABLE SECTION --- */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Live Tickets</h3>
                        <button 
                            onClick={handleDownloadTickets}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span>Download CSV</span>
                        </button>
                    </div>
                    {tickets.length === 0 ? (
                        <div className="text-center p-10 text-slate-500 bg-slate-50/50 dark:bg-slate-900/50 rounded-lg">
                            <p>No tickets yet.</p>
                            <p className="text-sm">New tickets will appear here automatically.</p>
                        </div>
                    ) : (
                        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Ticket ID</th>
                                        <th scope="col" className="px-6 py-3">Customer</th>
                                        <th scope="col" className="px-6 py-3">Issue</th>
                                        <th scope="col" className="px-6 py-3">Status</th>
                                        <th scope="col" className="px-6 py-3">Assigned To</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map(ticket => (
                                        <tr key={ticket.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                            <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">
                                                {ticket.id}
                                            </th>
                                            <td className="px-6 py-4">{ticket.customerName}</td>
                                            <td className="px-6 py-4">{ticket.category}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{getTechnicianName(ticket.assignedTo)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* --- CALL LOG TABLE SECTION --- */}
                 <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Call Log</h3>
                         <button 
                            onClick={handleDownloadCalls}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span>Download CSV</span>
                        </button>
                    </div>
                    {calls.length === 0 ? (
                        <div className="text-center p-10 text-slate-500 bg-slate-50/50 dark:bg-slate-900/50 rounded-lg">
                            <p>No calls have been made yet.</p>
                        </div>
                    ) : (
                        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Start Time</th>
                                        <th scope="col" className="px-6 py-3">Duration</th>
                                        <th scope="col" className="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...calls].reverse().map(call => {
                                        const duration = formatCallDuration(call.startTime, call.endTime);
                                        const getCallStatusColor = (status: Call['status']) => {
                                            switch (status) {
                                                case 'Completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
                                                case 'Forwarded': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
                                                case 'In Progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
                                                case 'Missed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
                                                default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
                                            }
                                        };
                                        return (
                                            <tr key={call.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                                <td className="px-6 py-4">{call.startTime.toLocaleString()}</td>
                                                <td className="px-6 py-4">{duration}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCallStatusColor(call.status)}`}>
                                                        {call.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
             <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                 <div className="flex justify-between items-center mb-3">
                    <h3 className="text-md font-semibold flex items-center gap-2">
                        <UserIcon className="w-5 h-5" /> Department SLA
                    </h3>
                    <button 
                        onClick={handleDownloadDepartmentSLA}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600/80 transition"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        <span>Download CSV</span>
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departmentStats.map(dept => (
                        <div key={dept.name} className="text-sm p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 shadow-sm border border-slate-200 dark:border-slate-700">
                           <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 truncate" title={dept.name}>{dept.name}</h4>
                           <div className="flex items-center justify-around gap-2 text-slate-600 dark:text-slate-300">
                                <div className="text-center">
                                    <p className="font-bold text-xl text-slate-800 dark:text-slate-100">{dept.totalTickets}</p>
                                    <p className="text-xs font-medium">Total</p>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-xl text-slate-800 dark:text-slate-100">{dept.resolvedTickets}</p>
                                    <p className="text-xs font-medium">Resolved</p>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-lg text-slate-800 dark:text-slate-100">{formatResolutionDuration(dept.avgResolutionTime)}</p>
                                    <p className="text-xs font-medium">Avg. Time</p>
                                </div>
                           </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardPanel;

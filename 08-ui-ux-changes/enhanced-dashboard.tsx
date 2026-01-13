// Enhanced Dashboard Component with Improved UX
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Avatar,
  Skeleton,
  Tooltip,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  SearchInput,
  EmptyState,
  ErrorBoundary
} from '@/components/ui';
import {
  BarChart3Icon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  FilterIcon,
  GridIcon,
  ListIcon,
  MoreVerticalIcon,
  PlusIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  UsersIcon
} from 'lucide-react';
import { useDashboard, useProjects } from '@/hooks';
import { formatDate, formatTimeAgo } from '@/utils/date';

interface DashboardProps {
  userId: string;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'active' | 'completed' | 'overdue';

const Dashboard: React.FC<DashboardProps> = ({ userId }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const {
    data: dashboardData,
    isLoading,
    error,
    refetch
  } = useDashboard(userId);

  const {
    data: projects,
    isLoading: projectsLoading
  } = useProjects({
    search: searchQuery,
    filter,
    limit: 20
  });

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3 }
    },
    hover: {
      y: -4,
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
      transition: { duration: 0.2 }
    }
  };

  // Memoized filtered data
  const filteredData = useMemo(() => {
    if (!dashboardData?.projects) return [];

    return dashboardData.projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          project.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = filter === 'all' ||
                           (filter === 'active' && project.status === 'active') ||
                           (filter === 'completed' && project.status === 'completed') ||
                           (filter === 'overdue' && project.isOverdue);

      return matchesSearch && matchesFilter;
    });
  }, [dashboardData?.projects, searchQuery, filter]);

  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    }
  }, [refetch]);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] p-8"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Unable to load dashboard
          </h3>
          <p className="text-gray-600 mb-6">
            We're having trouble loading your dashboard data. Please try again.
          </p>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="inline-flex items-center space-x-2"
          >
            <RefreshCwIcon className="w-4 h-4" />
            <span>Try Again</span>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <ErrorBoundary fallback={<div>Something went wrong with the dashboard</div>}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 p-6 max-w-7xl mx-auto"
      >
        {/* Header Section */}
        <motion.div
          variants={cardVariants}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {dashboardData?.user?.firstName}!
            </h1>
            <p className="text-gray-600">
              Here's what's happening with your projects today.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
              disabled={isLoading}
            >
              <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <FilterIcon className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  All Projects
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('active')}>
                  Active Projects
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('completed')}>
                  Completed Projects
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('overdue')}>
                  Overdue Projects
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <GridIcon className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <ListIcon className="w-4 h-4" />
              </Button>
            </div>

            <Button className="inline-flex items-center space-x-2">
              <PlusIcon className="w-4 h-4" />
              <span>New Project</span>
            </Button>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          variants={cardVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-8 rounded mb-3" />
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-6 w-16" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <StatCard
                icon={<BarChart3Icon className="w-6 h-6 text-blue-600" />}
                title="Total Projects"
                value={dashboardData?.stats?.totalProjects || 0}
                change="+12%"
                trend="up"
              />
              <StatCard
                icon={<CheckCircleIcon className="w-6 h-6 text-green-600" />}
                title="Completed Tasks"
                value={dashboardData?.stats?.completedTasks || 0}
                change="+8%"
                trend="up"
              />
              <StatCard
                icon={<ClockIcon className="w-6 h-6 text-orange-600" />}
                title="Pending Tasks"
                value={dashboardData?.stats?.pendingTasks || 0}
                change="-5%"
                trend="down"
              />
              <StatCard
                icon={<UsersIcon className="w-6 h-6 text-purple-600" />}
                title="Team Members"
                value={dashboardData?.stats?.teamMembers || 0}
                change="+3%"
                trend="up"
              />
            </>
          )}
        </motion.div>

        {/* Search Bar */}
        <motion.div variants={cardVariants}>
          <SearchInput
            placeholder="Search projects..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="max-w-md"
          />
        </motion.div>

        {/* Projects Section */}
        <motion.div variants={cardVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
            <Badge variant="secondary">
              {filteredData.length} project{filteredData.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <AnimatePresence mode="wait">
            {projectsLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`grid gap-6 ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1'
                }`}
              >
                {Array(6).fill(0).map((_, i) => (
                  <ProjectCardSkeleton key={i} viewMode={viewMode} />
                ))}
              </motion.div>
            ) : filteredData.length === 0 ? (
              <EmptyState
                icon={<BarChart3Icon className="w-12 h-12 text-gray-400" />}
                title="No projects found"
                description="Get started by creating your first project"
                action={
                  <Button>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                }
              />
            ) : (
              <motion.div
                key="projects"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`grid gap-6 ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1'
                }`}
              >
                {filteredData.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    viewMode={viewMode}
                    delay={index * 0.1}
                    isSelected={selectedProject === project.id}
                    onClick={() => setSelectedProject(
                      selectedProject === project.id ? null : project.id
                    )}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Recent Activity</h3>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-3/4 mb-1" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData?.recentActivity?.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Avatar className="w-8 h-8">
                        <img
                          src={activity.user?.avatar}
                          alt={activity.user?.name}
                        />
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{activity.user?.name}</span>
                          {' '}
                          {activity.action}
                          {' '}
                          <span className="font-medium">{activity.target}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeAgo(activity.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </ErrorBoundary>
  );
};

// Supporting components
const StatCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: number;
  change: string;
  trend: 'up' | 'down';
}> = ({ icon, title, value, change, trend }) => (
  <motion.div variants={cardVariants} whileHover="hover">
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="p-2 bg-gray-50 rounded-lg">
            {icon}
          </div>
          <div className={`flex items-center text-sm ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUpIcon className={`w-4 h-4 mr-1 ${
              trend === 'down' ? 'rotate-180' : ''
            }`} />
            {change}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const ProjectCard: React.FC<{
  project: any;
  viewMode: ViewMode;
  delay: number;
  isSelected: boolean;
  onClick: () => void;
}> = ({ project, viewMode, delay, isSelected, onClick }) => (
  <motion.div
    variants={cardVariants}
    whileHover="hover"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`cursor-pointer ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
    onClick={onClick}
  >
    <Card className={viewMode === 'list' ? 'flex' : ''}>
      <CardContent className={`p-6 ${viewMode === 'list' ? 'flex-1 flex items-center' : ''}`}>
        <div className={`flex ${viewMode === 'list' ? 'items-center space-x-6' : 'flex-col'}`}>
          <div className={viewMode === 'list' ? 'flex-1' : ''}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVerticalIcon className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Edit Project</DropdownMenuItem>
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {project.description}
            </p>
            <div className="flex items-center justify-between">
              <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                {project.status}
              </Badge>
              <span className="text-xs text-gray-500">
                {formatTimeAgo(project.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const ProjectCardSkeleton: React.FC<{ viewMode: ViewMode }> = ({ viewMode }) => (
  <Card className={viewMode === 'list' ? 'flex' : ''}>
    <CardContent className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-2/3 mb-4" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </CardContent>
  </Card>
);

export default Dashboard;
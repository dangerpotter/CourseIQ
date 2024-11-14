import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trophy, Calendar, Layers } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

const Analytics = ({ data }) => {
  // Activity type colors
  const activityColors = {
    discussion: "#3B82F6", // Blue
    study: "#F59E0B", // Amber
    assignment: "#10B981", // Emerald
    quiz: "#8B5CF6", // Purple
    other: "#EC4899", // Pink
  };

  // Prepare data for the pie chart
  const activityTypeData = Object.entries(
    data?.activityCounts?.byType || {}
  ).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
    color: activityColors[type.toLowerCase()],
  }));

  // Prepare data for weekly distribution
  const weeklyData =
    data?.weeks?.map((week) => ({
      name: `Week ${week.weekNumber}`,
      activities: week.activities.length,
      points: week.activities.reduce(
        (sum, act) => sum + (act.gradePoints || 0),
        0
      ),
    })) || [];

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-500" />
              Total Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">
              {data?.activityCounts?.total || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-500" />
              Total Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">
              {data?.course?.totalPoints || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-500" />
              Course Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">
              {data?.weeks?.length || 0} Weeks
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            {" "}
            {/* Increased height */}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activityTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {activityTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Activity Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  height={60}
                  tick={{ fill: "currentColor" }}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fill: "currentColor" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "currentColor" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  cursor={{
                    fill: "rgba(148, 163, 184, 0.1)", // Subtle highlight for dark/light mode
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="activities"
                  fill="#3B82F6"
                  name="Activities"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="points"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Points"
                  dot={{ fill: "#10B981", r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* New: Activity Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Points Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data?.activityCounts?.byType || {}).map(
                ([type, count]) => {
                  const totalPoints = data.weeks
                    .flatMap((w) => w.activities)
                    .filter(
                      (a) => a.activityType.toLowerCase() === type.toLowerCase()
                    )
                    .reduce((sum, a) => sum + (a.gradePoints || 0), 0);

                  return (
                    <div key={type} className="flex items-center gap-4">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: activityColors[type.toLowerCase()],
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="capitalize">{type}</span>
                          <span className="font-medium">
                            {totalPoints} points
                          </span>
                        </div>
                        <div className="mt-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${
                                (totalPoints / data.course.totalPoints) * 100
                              }%`,
                              backgroundColor:
                                activityColors[type.toLowerCase()],
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Average Activities per Week:
                <span className="font-medium text-foreground ml-2">
                  {(data?.activityCounts?.total / data?.weeks?.length).toFixed(
                    1
                  )}
                </span>
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                Average Points per Activity:
                <span className="font-medium text-foreground ml-2">
                  {(
                    data?.course?.totalPoints / data?.activityCounts?.total
                  ).toFixed(1)}
                </span>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Weekly Pattern</h4>
                <div className="flex flex-wrap gap-2">
                  {data?.weeks?.map((week) => (
                    <div
                      key={week.weekNumber}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="text-xs text-gray-500">
                        W{week.weekNumber}
                      </div>
                      <div className="flex flex-col gap-1">
                        {week.activities.map((activity, idx) => (
                          <div
                            key={idx}
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                activityColors[
                                  activity.activityType.toLowerCase()
                                ],
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;

const _ = require("lodash");
const fs = require("fs").promises;
const path = require("path");

class CourseTransformer {
  constructor(sourceJson, outputPath) {
    this.source = sourceJson;
    this.outputPath = outputPath;
    this.transformed = {
      course: {},
      metadata: {},
      competencies: [],
      courseOverview: {},
      weeks: [],
      resources: {},
      gradingScheme: {},
      activityCounts: {
        total: 0,
        byType: {
          discussion: 0,
          assignment: 0,
          study: 0,
          other: 0,
        },
      },
      activitySequencing: {
        byWeek: {},
        byType: {
          DISCUSSION: [],
          STUDY: [],
          ASSIGNMENT: [],
          OTHER: [],
        },
      },
    };
    this.activityCount = 0;
  }

  // Helper Methods
  findActivity(activityId) {
    return this.source.activities.find((a) => a.activity.id === activityId);
  }

  findActivityText(textId) {
    const activityText = this.source.activityText.find((t) => t.id === textId);
    return activityText ? this.cleanHtmlContent(activityText.text) : "";
  }

  findWeekForActivity(activityId) {
    for (const unit of this.source.units) {
      if (unit.activityIds.includes(activityId)) {
        const weekNumber = this.source.units.indexOf(unit) + 1;
        return { weekNumber };
      }
    }
    return null;
  }

  findCriteriaForActivity(activityId, competencyId) {
    return this.source.criteria
      .filter(
        (c) =>
          c.activityId === activityId &&
          c.competencyId === competencyId &&
          c.criterion
      )
      .map((c) => ({
        id: c.criterion.id,
        text: c.criterion.text,
        weight: c.criterion.gradeWeight,
        points: c.criterion.gradePoints,
        competencyId: c.competencyId,
      }));
  }

  findActivitiesForCompetency(competencyId) {
    return this.source.criteria
      .filter((c) => c.competencyId === competencyId)
      .map((c) => c.activityId);
  }

  findCompetenciesForActivity(activityId) {
    return this.source.criteria
      .filter((c) => c.activityId === activityId)
      .map((c) => c.competencyId);
  }

  findPerformanceLevels(criterionId) {
    return this.source.performanceLevels
      .filter((pl) => pl.criterionId === criterionId)
      .map((pl) => ({
        type: pl.performanceLevel.performanceLevelType,
        points: pl.performanceLevel.gradePoints,
        text: pl.performanceLevel.text,
      }));
  }

  getActivitySequenceInWeek(activityId, weekNumber) {
    if (!weekNumber) return null;
    const week = this.transformed.weeks.find(
      (w) => w.weekNumber === weekNumber
    );
    if (!week) return null;

    const activity = week.activities.find((a) => a.id === activityId);
    return activity ? activity.sequenceNumber : null;
  }

  cleanHtmlContent(html) {
    return html ? html.trim() : "";
  }

  calculateTotalPoints() {
    return this.source.activities.reduce((total, activity) => {
      return total + (activity.activity.gradePoints || 0);
    }, 0);
  }

  countActivitiesByType(activities) {
    return activities.reduce((counts, activity) => {
      const type = activity.activityType?.toLowerCase() || "other";
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});
  }

  async saveOutput() {
    try {
      await fs.mkdir(path.dirname(this.outputPath), { recursive: true });
      await fs.writeFile(
        this.outputPath,
        JSON.stringify(this.transformed, null, 2)
      );
      console.log(`Transformed data saved to: ${this.outputPath}`);
    } catch (error) {
      console.error("Error saving output:", error);
      throw error;
    }
  }

  // Main transformation methods
  async transform() {
    try {
      this.transformMetadata();
      this.transformCourseBasics();
      this.transformCompetencies();
      this.transformCourseOverview();
      this.transformGradingScheme();
      this.transformResources();
      this.transformWeeks();
      this.finalizeActivityCounts();

      validateTransformedData(this.transformed);
      await this.saveOutput();
      return this.transformed;
    } catch (error) {
      console.error("Error during transformation:", error);
      throw error;
    }
  }

  transformMetadata() {
    const course = this.source.course;
    this.transformed.metadata = {
      lastUpdated: new Date(course.updatedDate).toISOString(),
      version: course.version,
      status: course.status,
      effectiveDate: course.launchDate,
      courseDesignModel: course.courseDesignModelType,
      totalWeeks: this.source.units.length,
      createdBy: course.createdBy,
      updatedBy: course.updatedBy,
    };
  }

  transformCourseBasics() {
    const course = this.source.course;
    this.transformed.course = {
      id: course.id,
      number: course.number,
      name: course.name,
      credits: course.credits,
      version: course.version,
      type: course.instanceOf,
      totalPoints: this.calculateTotalPoints(),
    };
  }

  transformCompetencies() {
    this.transformed.competencies = this.source.competencies.map((comp) => {
      const activityIds = this.findActivitiesForCompetency(comp.id);
      const uniqueActivityIds = [...new Set(activityIds)];

      const activities = uniqueActivityIds
        .map((activityId) => {
          const activity = this.findActivity(activityId);
          const week = this.findWeekForActivity(activityId);
          const criteria = this.findCriteriaForActivity(activityId, comp.id);

          return {
            id: activityId,
            code: activity?.activity?.code || null,
            title: activity?.activity?.title || "Unknown Activity",
            type: activity?.activity?.activityType || "Unknown Type",
            weight: activity?.activity?.gradeWeight || 0,
            points: activity?.activity?.gradePoints || 0,
            weekNumber: week?.weekNumber || 0,
            weekSequence: this.getActivitySequenceInWeek(
              activityId,
              week?.weekNumber
            ),
            criteria: criteria,
          };
        })
        .filter((activity) => activity.title !== "Unknown Activity");

      return {
        id: comp.id,
        text: comp.text,
        totalPoints: activities.reduce(
          (sum, activity) => sum + activity.points,
          0
        ),
        activities,
      };
    });
  }

  transformCourseOverview() {
    const overview = this.source.courseOverview || {};
    this.transformed.courseOverview = {
      id: overview.id || null,
      text: this.cleanHtmlContent(overview.text || ""),
    };
  }

  transformGradingScheme() {
    const overviewText = this.source.courseOverview?.text || "";
    const gradingSchemeMatch = overviewText.match(
      /A\s*=\s*(\d+)%.*?B\s*=\s*(\d+)%.*?C\s*=\s*(\d+)%.*?F\s*=\s*(\d+)%/s
    );

    if (gradingSchemeMatch) {
      this.transformed.gradingScheme = {
        A: { min: parseInt(gradingSchemeMatch[1]) },
        B: { min: parseInt(gradingSchemeMatch[2]) },
        C: { min: parseInt(gradingSchemeMatch[3]) },
        F: { max: parseInt(gradingSchemeMatch[4]) },
      };
    } else {
      this.transformed.gradingScheme = {
        A: { min: 90 },
        B: { min: 80 },
        C: { min: 70 },
        F: { max: 69 },
      };
    }
  }

  transformWeeks() {
    const sortedUnits = _.sortBy(this.source.units, (unit) => {
      const weekMatch = unit.unit.title.match(/Week (\d+)/i);
      return weekMatch
        ? parseInt(weekMatch[1])
        : this.source.units.indexOf(unit) + 1;
    });

    this.transformed.weeks = sortedUnits.map((unit, index) => {
      const weekNumber = index + 1;
      const weekActivities = this.transformActivities(
        unit.activityIds,
        weekNumber
      );

      // Track activities by type for this week
      this.transformed.activitySequencing.byWeek[weekNumber] = {
        studies: weekActivities
          .filter((a) => a.activityType.toLowerCase() === "study")
          .map((a) => ({ id: a.id, sequence: a.sequenceNumber })),
        discussions: weekActivities
          .filter((a) => a.activityType.toLowerCase() === "discussion")
          .map((a) => ({ id: a.id, sequence: a.sequenceNumber })),
        assignments: weekActivities
          .filter((a) => a.activityType.toLowerCase() === "assignment")
          .map((a) => ({ id: a.id, sequence: a.sequenceNumber })),
      };

      return {
        weekNumber: weekNumber,
        id: unit.unit.id,
        title: unit.unit.title,
        introduction: this.transformIntroduction(unit.introductionId),
        duration: unit.unit.duration,
        activities: weekActivities,
        resources: this.getWeekResources(weekNumber),
        activityCount: {
          total: weekActivities.length,
          byType: this.countActivitiesByType(weekActivities),
        },
      };
    });
  }

  transformActivities(activityIds, weekNumber) {
    // Sort activities based on their intended sequence
    const sortedActivities = activityIds
      .map((id) => {
        const activity = this.findActivity(id);
        return {
          id,
          code: activity?.activity?.code || "",
          type: activity?.activity?.activityType || "",
        };
      })
      .sort((a, b) => {
        // Sort by activity type (studies first, then discussions, then assignments)
        const typeOrder = { study: 1, discussion: 2, assignment: 3 };
        const typeA = a.type.toLowerCase();
        const typeB = b.type.toLowerCase();
        return (typeOrder[typeA] || 4) - (typeOrder[typeB] || 4);
      });

    return sortedActivities
      .map((sortedActivity, index) => {
        const activity = this.findActivity(sortedActivity.id);
        if (!activity) return null;

        this.activityCount++; // Increment total activity count

        const activityType = activity.activity.activityType.toLowerCase();
        this.transformed.activityCounts.byType[activityType] =
          (this.transformed.activityCounts.byType[activityType] || 0) + 1;

        return {
          sequenceNumber: index + 1,
          id: activity.activity.id,
          code: activity.activity.code || null,
          title: activity.activity.title,
          activityType: activity.activity.activityType,
          gradeType: activity.activity.gradeType,
          gradeWeight: activity.activity.gradeWeight,
          gradePoints: activity.activity.gradePoints,
          weekNumber: weekNumber,
          text: activity.activityTextId
            ? this.findActivityText(activity.activityTextId)
            : "",
          scoringGuide: this.transformScoringGuide(activity.activity),
          resources: this.getActivityResources(activity.activity.id),
          competencies: this.findCompetenciesForActivity(activity.activity.id),
        };
      })
      .filter(Boolean);
  }

  transformIntroduction(introId) {
    const intro = this.source.introductions?.find((i) => i.id === introId);
    return intro
      ? {
          id: intro.id,
          text: this.cleanHtmlContent(intro.text),
        }
      : null;
  }

  transformScoringGuide(activity) {
    if (!activity.scoringGuideType || activity.scoringGuideType !== "RUBRIC") {
      return null;
    }

    const criteria = this.source.criteria
      .filter((c) => c.activityId === activity.id)
      .map((c) => ({
        id: c.criterion.id,
        text: c.criterion.text,
        gradeWeight: c.criterion.gradeWeight,
        gradePoints: c.criterion.gradePoints,
        competencyId: c.competencyId,
        performanceLevels: this.findPerformanceLevels(c.criterion.id),
      }));

    return criteria.length > 0 ? { criteria } : null;
  }

  determineResourceType(resource) {
    const name = resource.resource?.resourceName?.toLowerCase() || "";
    const mediaType = resource.resource?.mediaType?.toLowerCase() || "";
    const fileType = resource.resource?.fileType?.toLowerCase() || "";

    if (name.includes("reading list")) return "READING_LIST";
    if (mediaType.includes("link")) return "EXTERNAL_LINK";
    if (mediaType.includes("video") || mediaType.includes("audio"))
      return "MULTIMEDIA";
    if (mediaType.includes("graphic") || mediaType.includes("image"))
      return "MEDIA";
    if (name.includes("tutorial")) return "TUTORIAL";
    if (name.includes("template")) return "TEMPLATE";
    if (fileType.includes("pdf")) return "DOCUMENT";
    if (name.includes("simulation")) return "SIMULATION";
    if (name.includes("assessment")) return "ASSESSMENT";
    if (name.includes("rubric")) return "RUBRIC";
    return "OTHER";
  }

  normalizeResourceLinks(links) {
    if (!links) return [];
    if (typeof links === "string") return [links];
    return Array.isArray(links) ? links : [];
  }

  trackResourceUsage(resourceId) {
    const weekReferences =
      this.source.units
        ?.filter((unit) =>
          unit.courseResourceReferenceIds?.includes(resourceId)
        )
        .map((unit) => this.source.units.indexOf(unit) + 1) || [];

    const activityReferences =
      this.source.activities
        ?.filter((activity) =>
          activity.courseResourceReferenceIds?.includes(resourceId)
        )
        .map((activity) => ({
          id: activity.activity.id,
          type: activity.activity.activityType,
          week: this.findWeekForActivity(activity.activity.id)?.weekNumber,
        })) || [];

    return {
      weeks: weekReferences,
      activities: activityReferences,
      totalReferences: weekReferences.length + activityReferences.length,
    };
  }

  getWeekResources(weekNumber) {
    return (this.source.resourcesReferences || [])
      .filter((ref) => {
        const weekMatch =
          ref.courseResourceReference?.resourceName?.match(/Week (\d+)/i);
        return weekMatch && parseInt(weekMatch[1]) === weekNumber;
      })
      .map((ref) => ({
        id: ref.courseResourceReference.id,
        name: ref.courseResourceReference.resourceName,
        type: ref.courseResourceReference.mediaType,
      }));
  }

  getActivityResources(activityId) {
    return (this.source.resourcesReferences || [])
      .filter((ref) => {
        const courseResource = this.source.activities.find(
          (a) => a.activityIds && a.activityIds.includes(activityId)
        );
        return (
          courseResource &&
          courseResource.courseResourceReferenceIds &&
          courseResource.courseResourceReferenceIds.includes(
            ref.courseResourceReference.id
          )
        );
      })
      .map((ref) => ({
        id: ref.courseResourceReference.id,
        name: ref.courseResourceReference.resourceName,
        type: ref.courseResourceReference.mediaType,
      }));
  }

  transformResources() {
    const resources = this.source.resources || [];
    const enhancedResources = resources.map((resource) => {
      const resourceType = this.determineResourceType(resource);
      const usage = this.trackResourceUsage(resource.resource.id);

      return {
        id: resource.resource.id,
        name: resource.resource.resourceName,
        type: resourceType,
        links: this.normalizeResourceLinks(resource.resource.persistentLinks),
        description: resource.resource.annotation || "",
        mediaType: resource.resource.mediaType || "",
        usageType: resource.resource.usageType || "",
        usage: usage,
      };
    });

    // Group resources by type
    const groupedResources = _.groupBy(enhancedResources, "type");

    this.transformed.resources = Object.keys(groupedResources).reduce(
      (acc, type) => {
        acc[type] = {
          resources: groupedResources[type],
          count: groupedResources[type].length,
          totalUsage: groupedResources[type].reduce(
            (sum, resource) => sum + resource.usage.totalReferences,
            0
          ),
        };
        return acc;
      },
      {}
    );
  }

  finalizeActivityCounts() {
    let totalFromWeeks = 0;
    this.transformed.weeks.forEach((week) => {
      totalFromWeeks += week.activities.length;
    });

    if (this.activityCount !== totalFromWeeks) {
      console.warn(
        `Activity count mismatch: counter=${this.activityCount}, actual=${totalFromWeeks}`
      );
      this.activityCount = totalFromWeeks;
    }

    this.transformed.activityCounts.total = this.activityCount;

    // Verify that all activity types are accounted for
    const types = ["discussion", "assignment", "study", "other"];
    types.forEach((type) => {
      if (typeof this.transformed.activityCounts.byType[type] !== "number") {
        this.transformed.activityCounts.byType[type] = 0;
      }
    });
  }

  // Add this to the CourseTransformer class
  generateActivityAnalytics() {
    const analytics = {
      overview: {
        totalActivities: this.activityCount,
        totalPoints: this.calculateTotalPoints(),
        averagePointsPerActivity: 0,
        typeDistribution: {},
        weeklyDistribution: [],
        gradedVsNonGraded: {
          graded: 0,
          nonGraded: 0,
          totalPoints: 0,
        },
        competencyCoverage: {},
      },
      workloadAnalysis: {
        weeklyWorkload: [],
        heaviestWeek: null,
        lightestWeek: null,
        averageActivitiesPerWeek: 0,
      },
      sequencing: {
        typicalPatterns: [],
        weeklyPatterns: {},
        inconsistencies: [],
      },
      competencyMapping: {
        coverageByWeek: [],
        multipleCompetencyActivities: [],
        unmappedActivities: [],
      },
    };

    // Calculate type distribution and graded vs non-graded
    const activities = this.transformed.weeks.flatMap(
      (week) => week.activities
    );
    const typeCount = _.countBy(activities, "activityType");
    analytics.overview.typeDistribution = Object.entries(typeCount).map(
      ([type, count]) => ({
        type,
        count,
        percentage: ((count / this.activityCount) * 100).toFixed(1),
      })
    );

    // Calculate graded vs non-graded activities
    activities.forEach((activity) => {
      if (activity.gradePoints > 0) {
        analytics.overview.gradedVsNonGraded.graded++;
        analytics.overview.gradedVsNonGraded.totalPoints +=
          activity.gradePoints;
      } else {
        analytics.overview.gradedVsNonGraded.nonGraded++;
      }
    });

    // Calculate weekly distribution and workload
    this.transformed.weeks.forEach((week, index) => {
      const weekNumber = index + 1;
      const weeklyStats = {
        weekNumber,
        totalActivities: week.activities.length,
        totalPoints: week.activities.reduce(
          (sum, act) => sum + (act.gradePoints || 0),
          0
        ),
        typeBreakdown: _.countBy(week.activities, "activityType"),
        averagePointsPerActivity: 0,
      };

      weeklyStats.averagePointsPerActivity =
        weeklyStats.totalPoints / weeklyStats.totalActivities || 0;

      analytics.workloadAnalysis.weeklyWorkload.push(weeklyStats);

      // Track weekly patterns
      analytics.sequencing.weeklyPatterns[weekNumber] = week.activities.map(
        (a) => a.activityType
      );
    });

    // Find heaviest and lightest weeks
    analytics.workloadAnalysis.weeklyWorkload.sort(
      (a, b) => b.totalPoints - a.totalPoints
    );
    analytics.workloadAnalysis.heaviestWeek =
      analytics.workloadAnalysis.weeklyWorkload[0];
    analytics.workloadAnalysis.lightestWeek =
      analytics.workloadAnalysis.weeklyWorkload[
        analytics.workloadAnalysis.weeklyWorkload.length - 1
      ];
    analytics.workloadAnalysis.averageActivitiesPerWeek =
      this.activityCount / this.transformed.weeks.length;

    // Analyze competency coverage
    this.transformed.competencies.forEach((comp) => {
      analytics.overview.competencyCoverage[comp.id] = {
        competencyText: comp.text,
        totalActivities: comp.activities.length,
        totalPoints: comp.totalPoints,
        weeksCovered: [...new Set(comp.activities.map((a) => a.weekNumber))],
        activityTypes: _.countBy(comp.activities, "type"),
      };
    });

    // Find activities mapped to multiple competencies
    activities.forEach((activity) => {
      if (activity.competencies && activity.competencies.length > 1) {
        analytics.competencyMapping.multipleCompetencyActivities.push({
          activityId: activity.id,
          code: activity.code,
          competencies: activity.competencies,
        });
      } else if (!activity.competencies || activity.competencies.length === 0) {
        analytics.competencyMapping.unmappedActivities.push({
          activityId: activity.id,
          code: activity.code,
          type: activity.activityType,
        });
      }
    });

    // Calculate competency coverage by week
    this.transformed.weeks.forEach((week, index) => {
      const weekNumber = index + 1;
      const weeklyCompetencies = new Set();
      week.activities.forEach((activity) => {
        if (activity.competencies) {
          activity.competencies.forEach((comp) => weeklyCompetencies.add(comp));
        }
      });

      analytics.competencyMapping.coverageByWeek.push({
        weekNumber,
        competenciesCovered: Array.from(weeklyCompetencies),
        coveragePercentage: (
          (weeklyCompetencies.size / this.transformed.competencies.length) *
          100
        ).toFixed(1),
      });
    });

    // Calculate averages
    analytics.overview.averagePointsPerActivity =
      analytics.overview.gradedVsNonGraded.totalPoints /
        analytics.overview.gradedVsNonGraded.graded || 0;

    // Find typical sequencing patterns
    analytics.sequencing.typicalPatterns = this.findTypicalSequencingPatterns();

    return analytics;
  }

  findTypicalSequencingPatterns() {
    const patterns = [];
    const weekPatterns = {};

    // Analyze each week's activity sequence
    this.transformed.weeks.forEach((week) => {
      const sequence = week.activities.map((a) => a.activityType);
      const patternKey = sequence.join(",");
      weekPatterns[patternKey] = (weekPatterns[patternKey] || 0) + 1;
    });

    // Find the most common patterns
    const sortedPatterns = Object.entries(weekPatterns)
      .sort(([, a], [, b]) => b - a)
      .map(([pattern, count]) => ({
        pattern: pattern.split(","),
        frequency: count,
        percentage: ((count / this.transformed.weeks.length) * 100).toFixed(1),
      }));

    return sortedPatterns;
  }
}

const validateTransformedData = (data) => {
  const requiredKeys = [
    "course",
    "metadata",
    "competencies",
    "weeks",
    "resources",
    "activityCounts",
    "activitySequencing",
  ];

  // Check for missing required sections
  const missingKeys = requiredKeys.filter((key) => !data[key]);
  if (missingKeys.length > 0) {
    throw new Error(`Missing required sections: ${missingKeys.join(", ")}`);
  }

  // Validate activity counts
  const totalActivities = data.activityCounts.total;
  const sumByType = Object.values(data.activityCounts.byType).reduce(
    (a, b) => a + b,
    0
  );

  if (totalActivities !== sumByType) {
    throw new Error(
      `Activity count mismatch: total=${totalActivities}, sum=${sumByType}`
    );
  }

  // Validate week numbers are sequential
  const weekNumbers = data.weeks.map((w) => w.weekNumber);
  const expectedWeekNumbers = Array.from(
    { length: weekNumbers.length },
    (_, i) => i + 1
  );

  const hasCorrectWeeks = weekNumbers.every(
    (num, idx) => num === expectedWeekNumbers[idx]
  );

  if (!hasCorrectWeeks) {
    throw new Error("Week numbers are not sequential");
  }

  // Validate competency mappings
  const assignmentActivities = data.weeks
    .flatMap((w) => w.activities)
    .filter((a) => a.activityType.toLowerCase() === "assignment");

  const unmappedAssignments = assignmentActivities
    .filter((a) => !a.competencies || a.competencies.length === 0)
    .map((a) => a.code);

  if (unmappedAssignments.length > 0) {
    console.warn(
      `Warning: Found assignments without competency mappings: ${unmappedAssignments.join(
        ", "
      )}`
    );
  }

  return true;
};

module.exports = {
  CourseTransformer,
  validateTransformedData,
};

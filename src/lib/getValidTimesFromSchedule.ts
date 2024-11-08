import { DAYS_OF_THE_WEEK_IN_ORDER } from "@/data/constants";
import { db } from "@/drizzle/db";
import { ScheduleAvailabilityTable } from "@/drizzle/schema";
import { getCalendarEventTimes } from "@/server/googleCalendar";
import {
	addMinutes,
	areIntervalsOverlapping,
	isFriday,
	isMonday,
	isSaturday,
	isSunday,
	isThursday,
	isTuesday,
	isWednesday,
	isWithinInterval,
	setHours,
	setMinutes,
} from "date-fns";
import { fromZonedTime } from "date-fns-tz";

export async function getValidTimesFromSchedule(
	timesInOrder: Date[],
	event: { clerkUserId: string; durationInMinutes: number }
) {
	const start = timesInOrder[0];
	const end = timesInOrder.at(-1);

	if (start == null || end == null) return [];

	const schedule = await db.query.ScheduleTable.findFirst({
		where: ({ clerkUserId: userIdCol }, { eq }) =>
			eq(userIdCol, event.clerkUserId),
		with: { availabilities: true },
	});

	if (schedule == null) return [];

	const groupedAvailabilities = groupBy(
		schedule.availabilities,
		(a) => a.dayOfWeek
	);

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const eventTimes = await getCalendarEventTimes(event.clerkUserId, {
		start,
		end,
	});

	return timesInOrder.filter((intervalDate) => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const availabilities = getAvailabilities(
			groupedAvailabilities,
			intervalDate,
			schedule.timezone
		);
		const eventInterval = {
			start: intervalDate,
			end: addMinutes(intervalDate, event.durationInMinutes),
		};

		return (
			eventTimes.every((eventTime) => {
				return !areIntervalsOverlapping(eventTime, eventInterval);
			}) &&
			availabilities.some((availability) => {
				return (
					isWithinInterval(eventInterval.start, availability) &&
					isWithinInterval(eventInterval.end, availability)
				);
			})
		);
	});
}

function groupBy<T>(
	array: T[],
	keyGetter: (item: T) => string
): Record<string, T[]> {
	return array.reduce((acc, item) => {
		const key = keyGetter(item);
		if (!acc[key]) acc[key] = [];
		acc[key].push(item);
		return acc;
	}, {} as Record<string, T[]>);
}

function getAvailabilities(
	groupedAvailabilities: Partial<
		Record<
			(typeof DAYS_OF_THE_WEEK_IN_ORDER)[number],
			(typeof ScheduleAvailabilityTable.$inferSelect)[]
		>
	>,
	date: Date,
	timezone: string
) {
	let availabilities:
		| (typeof ScheduleAvailabilityTable.$inferSelect)[]
		| undefined;

	if (isMonday(date)) {
		availabilities = groupedAvailabilities.Monday;
	}
	if (isTuesday(date)) {
		availabilities = groupedAvailabilities.Tuesday;
	}
	if (isWednesday(date)) {
		availabilities = groupedAvailabilities.Wednesday;
	}
	if (isThursday(date)) {
		availabilities = groupedAvailabilities.Thursday;
	}
	if (isFriday(date)) {
		availabilities = groupedAvailabilities.Friday;
	}
	if (isSaturday(date)) {
		availabilities = groupedAvailabilities.Saturday;
	}
	if (isSunday(date)) {
		availabilities = groupedAvailabilities.Sunday;
	}
	if (availabilities == null) return [];

	return availabilities.map(({ startTime, endTime }) => {
		const start = fromZonedTime(
			setMinutes(
				setHours(date, parseInt(startTime.split(":")[0])),
				parseInt(startTime.split(":")[1])
			),
			timezone
		);
		const end = fromZonedTime(
			setMinutes(
				setHours(date, parseInt(endTime.split(":")[0])),
				parseInt(endTime.split(":")[1])
			),
			timezone
		);
		return { start, end };
	});
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars

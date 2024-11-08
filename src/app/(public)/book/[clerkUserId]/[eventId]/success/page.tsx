import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { db } from "@/drizzle/db";
import { formatDateTime } from "@/lib/formatters";
import { clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 0;

export default async function SuccessPage({
	params: { clerkUserId, eventId },
	searchParams: { startTime },
}: {
	params: { clerkUserId: string; eventId: string };
	searchParams: { startTime: string };
}) {
	const event = await db.query.EventTable.findFirst({
		where: ({ clerkUserId: UserIdCol, isActive, id }, { eq, and }) =>
			and(eq(isActive, true), eq(UserIdCol, clerkUserId), eq(id, eventId)),
	});

	if (event == null) notFound();

	const calendarUser = await clerkClient().users.getUser(clerkUserId);
	const startTimeDate = new Date(startTime);
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					Successfully Booked {event.name} with {calendarUser.fullName}
				</CardTitle>
				<CardDescription>{formatDateTime(startTimeDate)}</CardDescription>
				<CardContent>
					You should recieve an Email confirmation shortly. You can close this
					page now.
				</CardContent>
			</CardHeader>
			<CardFooter>
				<Button asChild>
					<Link href={`/book/${calendarUser.id}`}>Choose Another Event </Link>
				</Button>
			</CardFooter>
		</Card>
	);
}

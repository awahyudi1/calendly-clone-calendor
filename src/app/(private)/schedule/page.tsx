import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScheduleForm } from "@/components/ui/forms/ScheduleForm";
import { db } from "@/drizzle/db";
import { auth } from "@clerk/nextjs/server";

export const revalidate = 0;

export default async function SchedulePage() {
	const { userId, redirectToSignIn } = auth();
	if (userId == null) return redirectToSignIn();

	const schedule = await db.query.ScheduleTable.findFirst({
		where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
		with: {
			availabilities: true,
		},
	});

	return (
		<Card className="max-w-md mx-auto">
			<CardHeader>
				<CardTitle>Schedule</CardTitle>
			</CardHeader>
			<CardContent>
				<ScheduleForm Schedule={schedule} />
			</CardContent>
		</Card>
	);
}

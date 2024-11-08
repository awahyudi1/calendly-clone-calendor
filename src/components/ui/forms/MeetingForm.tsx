"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { meetingFormSchema } from "@/schema/meeting";
import { formatDate, formatTimeToString } from "@/lib/formatters";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "../form";
import { Button } from "../button";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../select";
import { formatTimezoneOffset } from "@/lib/formatters";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Calendar } from "../calendar";
import { CalendarIcon } from "@radix-ui/react-icons";
import { isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { toZonedTime } from "date-fns-tz";
import { Textarea } from "../textarea";
import { createMeeting } from "@/server/actions/meetings";
import { Input } from "../input";

export function MeetingForm({
	validTimes,
	eventId,
	clerkUserId,
}: {
	validTimes: Date[];
	eventId: string;
	clerkUserId: string;
}) {
	const [isCalendarOpen, setCalendarOpen] = useState(false);
	const form = useForm<z.infer<typeof meetingFormSchema>>({
		resolver: zodResolver(meetingFormSchema),
		defaultValues: {
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		},
	});

	const timezone = form.watch("timezone");
	const date = form.watch("date");
	const validTimesInTimezone = useMemo(() => {
		return validTimes.map((date) => toZonedTime(date, timezone));
	}, [validTimes, timezone]);

	async function onSubmit(values: z.infer<typeof meetingFormSchema>) {
		const data = await createMeeting({
			...values,
			eventId,
			clerkUserId,
		});

		if (data?.error) {
			form.setError("root", {
				message: "There was an error saving your event ",
			});
		}
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex gap-6 flex-col "
			>
				{form.formState.errors.root && (
					<div className="text-destructive text-sm">
						{form.formState.errors.root.message}
					</div>
				)}
				<FormField
					control={form.control}
					name="timezone"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Timezone</FormLabel>
							<Select onValueChange={field.onChange} defaultValue={field.value}>
								<FormControl>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{Intl.supportedValuesOf("timeZone").map((timezone) => (
										<SelectItem key={timezone} value={timezone}>
											{timezone} {` (${formatTimezoneOffset(timezone)})`}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex gap-4 flex-col md:flex-row">
					<FormField
						control={form.control}
						name="date"
						render={({ field }) => (
							<Popover open={isCalendarOpen} onOpenChange={setCalendarOpen}>
								<FormItem className="flex-1">
									<FormLabel>Date</FormLabel>
									<PopoverTrigger asChild>
										<FormControl>
											<Button
												variant="outline"
												onClick={() => setCalendarOpen(true)}
												className={cn(
													"pl-3 text-left font-normal flex w-full",
													!field.value && "text-muted-foreground"
												)}
											>
												{field.value ? (
													formatDate(field.value)
												) : (
													<span>Pick a date</span>
												)}
												<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
											</Button>
										</FormControl>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={field.value}
											onSelect={(date) => {
												field.onChange(date);
												setCalendarOpen(false); // Close calendar pop-up after selecting
											}}
											disabled={(date) =>
												!validTimesInTimezone.some((time) =>
													isSameDay(date, time)
												)
											}
											initialFocus
										/>
									</PopoverContent>
									<FormMessage />
								</FormItem>
							</Popover>
						)}
					/>
					<FormField
						control={form.control}
						name="startTime"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel>Time</FormLabel>

								<Select
									disabled={date == null || timezone == null}
									onValueChange={(value) =>
										field.onChange(new Date(Date.parse(value)))
									}
									defaultValue={field.value?.toISOString()}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue
												placeholder={
													date == null || timezone == null
														? "select a date / timezone first"
														: "Select a meeting time"
												}
											/>
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{validTimesInTimezone
											.filter((time) => isSameDay(time, date))
											.map((time) => (
												<SelectItem
													key={time.toISOString()}
													value={time.toISOString()}
												>
													{formatTimeToString(time)}
												</SelectItem>
											))}
									</SelectContent>
								</Select>

								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<div className="flex gap-4 flex-col md:flex-row">
					<FormField
						control={form.control}
						name="guestName"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel>Your Name</FormLabel>
								<FormControl>
									<Input {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<div className="flex gap-4 flex-col md:flex-row">
					<FormField
						control={form.control}
						name="guestEmail"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel>Your Email</FormLabel>
								<FormControl>
									<Input type="email" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<div className="flex gap-4 flex-col md:flex-row">
					<FormField
						control={form.control}
						name="guestNotes"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel>Notes</FormLabel>
								<FormControl>
									<Textarea className="resize-none" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<div className="flex gap-2 justify-end">
					<Button
						disabled={form.formState.isSubmitting}
						type="button"
						asChild
						variant="outline"
					>
						<Link href={`/book/${clerkUserId}`}>Cancel</Link>
					</Button>
					<Button disabled={form.formState.isSubmitting} type="submit">
						Schedule
					</Button>
				</div>
			</form>
		</Form>
	);
}

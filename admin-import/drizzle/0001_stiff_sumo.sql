CREATE TABLE `faqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` varchar(240) NOT NULL,
	`answer` text NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isPublished` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(320) NOT NULL,
	`company` varchar(160),
	`phone` varchar(40),
	`projectType` varchar(120),
	`budget` varchar(80),
	`message` text NOT NULL,
	`status` enum('new','contacted','closed') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolioItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`category` varchar(80) NOT NULL,
	`year` varchar(12) NOT NULL,
	`description` text NOT NULL,
	`videoUrl` text NOT NULL,
	`thumbnailUrl` text,
	`tags` text NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isFeatured` int NOT NULL DEFAULT 0,
	`isPublished` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolioItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`name` varchar(160) NOT NULL,
	`price` varchar(60) NOT NULL,
	`duration` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`accent` varchar(40) NOT NULL DEFAULT 'lime',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isPublished` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`),
	CONSTRAINT `services_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `siteSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandName` varchar(120) NOT NULL,
	`heroEyebrow` varchar(180) NOT NULL,
	`heroTitle` varchar(240) NOT NULL,
	`heroSubtitle` text NOT NULL,
	`contactEmail` varchar(320) NOT NULL,
	`contactPhone` varchar(40) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteSettings_id` PRIMARY KEY(`id`)
);

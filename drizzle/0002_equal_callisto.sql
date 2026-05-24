ALTER TABLE `debts` ADD `interestRate` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `debts` ADD `totalWithInterest` decimal(12,2);
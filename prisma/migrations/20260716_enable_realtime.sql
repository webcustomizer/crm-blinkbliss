-- Enable Supabase Realtime on messaging tables
-- Run this manually in Supabase SQL Editor or via migration

ALTER PUBLICATION supabase_realtime ADD TABLE "Message";
ALTER PUBLICATION supabase_realtime ADD TABLE "GroupMessage";
ALTER PUBLICATION supabase_realtime ADD TABLE "CRMSetting";

-- Enable Supabase Realtime on CRMSetting table for realtime settings sync
ALTER PUBLICATION supabase_realtime ADD TABLE "CRMSetting";

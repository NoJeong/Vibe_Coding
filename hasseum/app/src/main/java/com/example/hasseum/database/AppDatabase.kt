package com.example.hasseum.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(entities = [Record::class, Keyword::class, RecordKeywordCrossRef::class], version = 8, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {

    abstract fun recordDao(): RecordDao
    abstract fun keywordDao(): KeywordDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "hasseum_database"
                )
                .addMigrations(MIGRATION_7_8)
                .build()
                INSTANCE = instance
                instance
            }
        }

        val MIGRATION_7_8 = object : Migration(7, 8) {
            override fun migrate(database: SupportSQLiteDatabase) {
                // Create the new cross-ref table
                database.execSQL("CREATE TABLE `RecordKeywordCrossRef` (`recordId` INTEGER NOT NULL, `keywordText` TEXT NOT NULL, PRIMARY KEY(`recordId`, `keywordText`))")
                // Move data from old keyword column to the new cross-ref table
                database.execSQL("INSERT INTO RecordKeywordCrossRef (recordId, keywordText) SELECT id, keyword FROM records WHERE keyword IS NOT NULL AND keyword != ''")
                // We are not deleting the old column to avoid data loss in case of rollback, but in a real scenario you might want to.
            }
        }
    }
}

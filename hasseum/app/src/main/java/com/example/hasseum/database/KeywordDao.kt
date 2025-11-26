package com.example.hasseum.database

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface KeywordDao {

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(keyword: Keyword)

    @Update
    suspend fun update(keyword: Keyword)

    @Query("SELECT * FROM keywords WHERE text = :text LIMIT 1")
    suspend fun findByText(text: String): Keyword?

    @Query("UPDATE keywords SET isDeleted = 1 WHERE id = :id")
    suspend fun softDelete(id: Int)

    @Delete
    suspend fun delete(keyword: Keyword)

    @Query("SELECT * FROM keywords WHERE isDeleted = 0 ORDER BY text ASC")
    fun getAllKeywords(): Flow<List<Keyword>>
}

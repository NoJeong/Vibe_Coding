package com.example.hasseum.database

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "keywords", indices = [Index(value = ["text"], unique = true)])
data class Keyword(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val text: String,
    val isDeleted: Boolean = false
)

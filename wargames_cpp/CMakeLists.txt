cmake_minimum_required(VERSION 3.15)
project(wargames_cpp VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Find packages
find_package(SDL2 REQUIRED)
find_package(OpenGL REQUIRED)

# GeographicLib - try to find it
find_library(GEOGRAPHICLIB_LIBRARY 
    NAMES Geographic GeographicLib
    PATHS /opt/homebrew/lib /usr/local/lib
)
find_path(GEOGRAPHICLIB_INCLUDE_DIR 
    NAMES GeographicLib/Geodesic.hpp
    PATHS /opt/homebrew/include /usr/local/include
)

# Shapelib - try to find it
find_library(SHAPELIB_LIBRARY NAMES shp shapefile)
find_path(SHAPELIB_INCLUDE_DIR NAMES shapefil.h)

# GLAD (we'll include it directly in the project)
set(GLAD_SRC ${CMAKE_SOURCE_DIR}/src/gl.c)

# Collect sources
file(GLOB_RECURSE SOURCES 
    ${CMAKE_SOURCE_DIR}/src/*.cpp
)

# Create executable
add_executable(${PROJECT_NAME} 
    ${SOURCES}
    ${GLAD_SRC}
)

# Include directories
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${SDL2_INCLUDE_DIRS}
    ${OPENGL_INCLUDE_DIR}
)

# Link libraries
target_link_libraries(${PROJECT_NAME} PRIVATE
    ${SDL2_LIBRARIES}
    ${OPENGL_LIBRARIES}
    ${CMAKE_DL_LIBS}
)

# Add GeographicLib if found
if(GEOGRAPHICLIB_LIBRARY AND GEOGRAPHICLIB_INCLUDE_DIR)
    message(STATUS "Found GeographicLib: ${GEOGRAPHICLIB_LIBRARY}")
    target_include_directories(${PROJECT_NAME} PRIVATE ${GEOGRAPHICLIB_INCLUDE_DIR})
    target_link_libraries(${PROJECT_NAME} PRIVATE ${GEOGRAPHICLIB_LIBRARY})
else()
    message(WARNING "GeographicLib not found. Install with: brew install geographiclib")
endif()

# Add Shapelib if found
if(SHAPELIB_LIBRARY AND SHAPELIB_INCLUDE_DIR)
    message(STATUS "Found Shapelib: ${SHAPELIB_LIBRARY}")
    target_include_directories(${PROJECT_NAME} PRIVATE ${SHAPELIB_INCLUDE_DIR})
    target_link_libraries(${PROJECT_NAME} PRIVATE ${SHAPELIB_LIBRARY})
else()
    message(WARNING "Shapelib not found. Install with: brew install shapelib")
endif()

# macOS specific settings
if(APPLE)
    target_link_libraries(${PROJECT_NAME} PRIVATE "-framework Cocoa" "-framework IOKit")
endif()

# Copy shaders to build directory
file(COPY ${CMAKE_SOURCE_DIR}/shaders DESTINATION ${CMAKE_BINARY_DIR})

# Copy data to build directory
file(COPY ${CMAKE_SOURCE_DIR}/data DESTINATION ${CMAKE_BINARY_DIR})

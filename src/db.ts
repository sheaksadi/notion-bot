import { Client as NotionClient } from "@notionhq/client";

export class Db {
    private notion: NotionClient;
    private readonly databaseId: string;

    public constructor(notion: NotionClient, databaseId: string) {
        this.notion = notion;
        this.databaseId = databaseId;
    }

    public async addItemToDatabase(item: DatabaseEntry): Promise<void> {
        try {
            type Properties = Parameters<NotionClient['pages']['create']>[0]['properties'];

            const properties: Properties = {
                Name: {
                    title: [{ text: { content: item.Name } }]
                },
                Notes: {
                    rich_text: item.Notes ? [{ text: { content: item.Notes } }] : []
                },
                Priority: {
                    select: item.Priority ? { name: item.Priority } : null
                },
                Rating: {
                    select: item.Rating ? { name: item.Rating } : null
                },
                Progress: {
                    status: { name: item.Progress }
                },
            };

            await this.notion.pages.create({
                parent: { database_id: this.databaseId },
                properties: properties,
            });
            console.log('Item added successfully');
        } catch (error) {
            console.error('Error adding item:', error);
            throw error;
        }
    }

    public async getEntryByName(name: string): Promise<DatabaseEntry | false> {
        try {
            const response = await this.notion.databases.query({
                database_id: this.databaseId,
                filter: {
                    property: "Name",
                    title: {
                        equals: name
                    }
                }
            });

            if (response.results.length > 0) {
                const page = response.results[0];
                return this.convertPageToEntry(page);
            }

            return false;
        } catch (error) {
            console.error('Error retrieving entry:', error);
            throw error;
        }
    }

    public async updateEntryByName(name: string, updates: Partial<DatabaseEntry>): Promise<void> {
        try {
            const entry = await this.getEntryByName(name);

            if (!entry) {
                console.log(`Entry with name "${name}" not found. Creating a new entry.`);
                await this.addItemToDatabase({
                    Name: updates.Name || name,
                    Notes: updates.Notes || '',
                    Priority: updates.Priority || 'Low',
                    Rating: updates.Rating || '',
                    Progress: updates.Progress || 'Plan to watch'
                });
                return;
            }

            const pageId = entry.id;
            const properties: any = {};

            if (updates.Name) properties.Name = { title: [{ text: { content: updates.Name } }] };
            if (updates.Notes) properties.Notes = { rich_text: [{ text: { content: updates.Notes } }] };
            if (updates.Priority) properties.Priority = { select: { name: updates.Priority } };
            if (updates.Rating) properties.Rating = { select: { name: updates.Rating } };
            if (updates.Progress) properties.Progress = { status: { name: updates.Progress } };

            await this.notion.pages.update({
                page_id: pageId || '',
                properties: properties
            });

            console.log('Entry updated successfully');
        } catch (error) {
            console.error('Error updating entry:', error);
            throw error;
        }
    }

    public async appendToNotes(name: string, newNote: string): Promise<void> {
        try {
            const entry = await this.getEntryByName(name);

            if (!entry) {
                throw new Error(`Entry with name "${name}" not found`);
            }

            const pageId = entry.id;
            const currentNotes = entry.Notes || '';
            const updatedNotes = currentNotes + (currentNotes ? '\n' : '') + newNote; // Append with a newline if there's existing text

            await this.notion.pages.update({
                page_id: pageId || '',
                properties: {
                    Notes: {
                        rich_text: [{ text: { content: updatedNotes } }]
                    }
                }
            });

            console.log('Notes updated successfully');
        } catch (error) {
            console.error('Error appending to notes:', error);
            throw error;
        }
    }

    private convertPageToEntry(page: any): DatabaseEntry {
        return {
            id: page.id,
            Name: page.properties.Name.title[0]?.plain_text || '',
            Notes: page.properties.Notes.rich_text[0]?.plain_text || '',
            Priority: page.properties.Priority.select?.name,
            Rating: page.properties.Rating.select?.name,
            Progress: page.properties.Progress.status.name
        };
    }
}

export interface DatabaseEntry {
    id?: string;
    Name: string;
    Notes?: string;
    Priority?: Priority;
    Rating?: Rating;
    Progress: Progress;
}

export type Priority = 'High' | 'Medium' | 'Low';
export type Rating = 'F' | 'D' | 'B' | 'A' | 'S' | '';
export type Progress = 'Plan to watch' | 'In progress' | 'Done';

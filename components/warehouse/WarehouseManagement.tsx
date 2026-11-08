
import React, { useState } from 'react';
import { WarehouseImport } from './WarehouseImport';
import { WarehouseInventory } from './WarehouseInventory';
import { NetDataRecord, WarehouseItem } from '../../types';

interface WarehouseManagementProps {
    netData: NetDataRecord[];
    activeView: string; // From Ribbon
    onTransferToDept?: (data: any) => void; // New Prop to handle export/transfer
    defaultDepartment?: string; // New Prop to pass department context
}

export const WarehouseManagement: React.FC<WarehouseManagementProps> = ({ netData, activeView, onTransferToDept, defaultDepartment }) => {
    // Shared State for Warehouse Data (In a real app, this would be lifted higher or in Context)
    // NOTE: In the full App.tsx logic, if we want persistent warehouse data that interacts with other modules,
    // this state should ideally be in App.tsx. However, based on current structure, we keep it here 
    // and just handle the "Transfer Out" action.
    const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);

    const handleImport = (newItems: WarehouseItem[]) => {
        setWarehouseItems(prev => [...newItems, ...prev]);
    };

    const handleExport = (exportItem: WarehouseItem) => {
        // 1. Remove/Reduce quantity from local Warehouse Inventory
        setWarehouseItems(prev => {
            const updated = prev.map(item => {
                if (item.id === exportItem.id) { // Match by specific ID
                     return { ...item, quantity: item.quantity - exportItem.quantity };
                }
                return item;
            });
            // Filter out 0 quantity items (or keep them as 0 depending on preference, here we remove)
            return updated.filter(item => item.quantity > 0);
        });

        // 2. Propagate data to Parent (App.tsx) to add to Target Dept's Pending List
        if (onTransferToDept) {
            onTransferToDept(exportItem);
        }
    };

    if (activeView === 'wh_import') {
        return <WarehouseImport netData={netData} onImport={handleImport} />;
    }

    if (activeView === 'wh_inventory') {
        return (
            <WarehouseInventory 
                items={warehouseItems} 
                onExport={handleExport} 
                defaultDepartment={defaultDepartment} // Pass down the prop
            />
        );
    }

    return <div>Select a view</div>;
};
